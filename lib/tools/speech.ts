import { generateSpeech, transcribe } from 'ai';
import { z } from 'zod';
import { getConfig, isModelAllowed } from '../env';
import { errorResult, textResult, toolError, warningNote, type ToolContext } from '../gateway';
import { fetchMedia, MediaError, readCost, storeAndLink } from '../media';
import { findModel } from '../models';

export const generateSpeechTool = {
  name: 'generate_speech',
  description:
    'Turn text into spoken audio: narration, voice-overs, audiobook chapters, podcast intros. Returns the audio inline and, if a Blob store is connected, a private download link that expires. Models: "openai/tts-1-hd", "google/gemini-3.8-flash-tts", "fish-audio/s2-pro", "microsoft/mai-voice-2.1" (list_models with type "speech" shows all and their prices). Voices are model-specific, e.g. "alloy", "nova" or "onyx" on OpenAI.',
  inputSchema: z.object({
    model: z.string().describe('Speech model id from list_models with type "speech"'),
    text: z.string().min(1).describe('What to say'),
    voice: z.string().optional().describe('Voice name for this model, e.g. "nova" (OpenAI)'),
    instructions: z.string().optional().describe('How to say it, e.g. "warm and slow, like a bedtime story" (models that support it)'),
    speed: z.number().positive().optional().describe('1 is normal; 0.5 is half speed, 2 is double'),
    language: z.string().optional().describe('ISO 639-1 code like "en" or "th", or "auto"'),
    format: z.string().optional().describe('Audio format like "mp3" or "wav". Default depends on the model.'),
  }),
  async run(
    args: { model: string; text: string; voice?: string; instructions?: string; speed?: number; language?: string; format?: string },
    ctx: ToolContext,
  ) {
    const { model, text } = args;
    if (!isModelAllowed(model)) return errorResult(`Model "${model}" is not in this server's ALLOWED_MODELS list.`);
    const { maxSpeechCharacters } = getConfig();
    if (text.length > maxSpeechCharacters) {
      return errorResult(
        `The text is ${text.length} characters, above this server's limit of ${maxSpeechCharacters} per call (MAX_SPEECH_CHARACTERS). Split it into parts and call once per part.`,
      );
    }
    try {
      const info = await findModel(model);
      if (!info) return errorResult(`Unknown model "${model}". Call list_models with type "speech" to see speech models.`);
      if (info.type !== 'speech') return errorResult(`Model "${model}" is not a speech model. Call list_models with type "speech".`);

      const result = await generateSpeech({
        model: ctx.gateway.speechModel(model),
        text,
        voice: args.voice,
        instructions: args.instructions,
        speed: args.speed,
        language: args.language,
        outputFormat: args.format,
        providerOptions: ctx.gatewayOptions('generate_speech'),
      });
      const { audio } = result;
      const cost = readCost(result.providerMetadata);
      const stored = await storeAndLink('audio', [{ bytes: audio.uint8Array, mediaType: audio.mediaType }], 'Audio');
      const summary = [
        `Speech from ${model} (${audio.format})${cost != null ? `, cost: $${cost}` : ''}.`,
        ...stored.links,
        ...stored.notes,
        ...result.warnings.map(warningNote),
      ].join('\n');
      return {
        content: [
          { type: 'audio' as const, data: audio.base64, mimeType: audio.mediaType },
          { type: 'text' as const, text: summary },
        ],
      };
    } catch (error) {
      return toolError(error, model, 'speech');
    }
  },
};

const timestamp = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const transcribeTool = {
  name: 'transcribe',
  description:
    'Turn speech in an audio or video file into text, optionally with timestamps (for subtitles, notes or translating a voice-over). Give an https link to the file, up to 25 MB. Models: "openai/gpt-4o-transcribe", "openai/whisper-1", "google/gemini-3.5-transcribe" (list_models with type "transcription").',
  inputSchema: z.object({
    model: z.string().describe('Transcription model id from list_models with type "transcription"'),
    audio_url: z.string().url().describe('https link to an audio or video file'),
    timestamps: z.boolean().optional().describe('Include a timestamp on each line, when the model returns them. Default false.'),
  }),
  async run({ model, audio_url, timestamps = false }: { model: string; audio_url: string; timestamps?: boolean }, ctx: ToolContext) {
    if (!isModelAllowed(model)) return errorResult(`Model "${model}" is not in this server's ALLOWED_MODELS list.`);
    try {
      const info = await findModel(model);
      if (!info) return errorResult(`Unknown model "${model}". Call list_models with type "transcription" to see transcription models.`);
      if (info.type !== 'transcription') return errorResult(`Model "${model}" is not a transcription model. Call list_models with type "transcription".`);

      const audio = await fetchMedia(audio_url, 'audio');
      const result = await transcribe({
        model: ctx.gateway.transcriptionModel(model),
        audio: audio.bytes,
        providerOptions: ctx.gatewayOptions('transcribe'),
      });
      const cost = readCost(result.providerMetadata);
      const about = [
        result.language ? `language: ${result.language}` : '',
        result.durationInSeconds ? `length: ${timestamp(result.durationInSeconds)}` : '',
        cost != null ? `cost: $${cost}` : '',
      ].filter(Boolean);
      const body =
        timestamps && result.segments.length > 0
          ? result.segments.map((s) => `[${timestamp(s.startSecond)}–${timestamp(s.endSecond)}] ${s.text.trim()}`).join('\n')
          : result.text;
      return textResult(`Transcript from ${model}${about.length ? ` (${about.join(', ')})` : ''}:\n\n${body}`);
    } catch (error) {
      return error instanceof MediaError ? errorResult(error.message) : toolError(error, model, 'transcription');
    }
  },
};
