import { generateText, type FilePart } from 'ai';
import { z } from 'zod';
import { isModelAllowed } from '../env';
import { errorResult, textResult, toolError, type ToolContext } from '../gateway';
import { fetchMedia, inputKindOf, MediaError, type Media } from '../media';
import { findModel, kindsOf } from '../models';
import { httpsUrl } from './start-video';

/** The list_models capability tag for each kind of input. */
const CAPABILITY = { image: 'vision', video: 'video-input', audio: 'audio-input', pdf: 'file-input' } as const;

// Gemini takes at most about 20 MB of inline files per request, and files go as bytes.
const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

/** Downloads the files in order, stopping as soon as their total is too big. */
async function fetchFiles(urls: string[]): Promise<Media[]> {
  const files: Media[] = [];
  let total = 0;
  for (const url of urls) {
    const file = await fetchMedia(url, 'file');
    total += file.bytes.byteLength;
    if (total > MAX_TOTAL_BYTES) throw new MediaError(`The files add up to more than ${MAX_TOTAL_BYTES / 1024 / 1024} MB, the most one call can send.`);
    files.push(file);
  }
  return files;
}

type Args = { model: string; prompt: string; system?: string; max_tokens?: number; file_urls?: string[] };

export const generateTextTool = {
  name: 'generate_text',
  description:
    'Generate text with any AI Gateway language model (e.g. "openai/gpt-5.5", "anthropic/claude-sonnet-5"). Billed to this deployment owner\'s AI Gateway credits. With file_urls, the model reads images, videos, audio or PDFs too, e.g. Gemini ("google/gemini-3.5-flash-lite") watching a video to summarize it; list_models shows what each model reads. Links must be https; links returned by this server work.',
  inputSchema: z.object({
    model: z.string().describe('Model id from list_models, e.g. "google/gemini-3-flash"'),
    prompt: z.string().min(1),
    system: z.string().optional().describe('Optional system instructions'),
    max_tokens: z.number().int().positive().max(128000).optional(),
    file_urls: z
      .array(httpsUrl)
      .min(1)
      .max(MAX_FILES)
      .optional()
      .describe(`Images, videos, audio or PDFs for the model to read, ${MAX_TOTAL_BYTES / 1024 / 1024} MB in total at most`),
  }),
  async run({ model, prompt, system, max_tokens, file_urls }: Args, ctx: ToolContext) {
    if (!isModelAllowed(model)) return errorResult(`Model "${model}" is not in this server's ALLOWED_MODELS list.`);
    try {
      const info = await findModel(model);
      if (!info) return errorResult(`Unknown model "${model}". Call list_models with type "text" to see text models.`);
      if (!kindsOf(info).includes('text')) return errorResult(`Model "${model}" is not a text model. Call list_models with type "text".`);

      const files = file_urls ? await fetchFiles(file_urls) : [];
      const reads = info.modalities?.input ?? [];
      const unreadable = [...new Set(files.map((f) => inputKindOf(f.mediaType)!))].filter((kind) => !reads.includes(kind));
      if (unreadable.length) {
        return errorResult(
          `"${model}" cannot read ${unreadable.join(' or ')} files; it reads ${reads.join(', ') || 'text only'}. Call list_models with type "text" and pick a model tagged ${unreadable.map((kind) => `"${CAPABILITY[kind]}"`).join(' and ')}.`,
        );
      }

      const result = await generateText({
        model: ctx.gateway.languageModel(model),
        ...(files.length
          ? {
              messages: [
                {
                  role: 'user' as const,
                  content: [
                    ...files.map((f): FilePart => ({ type: 'file', data: f.bytes, mediaType: f.mediaType })),
                    { type: 'text' as const, text: prompt },
                  ],
                },
              ],
            }
          : { prompt }),
        instructions: system,
        maxOutputTokens: max_tokens,
        providerOptions: ctx.gatewayOptions('generate_text'),
      });
      const cost = result.providerMetadata?.gateway?.cost;
      const footer = `\n\n— model: ${model}${cost != null ? `, cost: $${cost}` : ''}`;
      return textResult(result.text + footer);
    } catch (error) {
      return error instanceof MediaError ? errorResult(error.message) : toolError(error, model, 'text');
    }
  },
};
