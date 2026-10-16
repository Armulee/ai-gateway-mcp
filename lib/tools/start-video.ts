import type { CallToolResult } from '@modelcontextprotocol/server';
import { experimental_startVideo as startVideo } from 'ai';
import { z } from 'zod';
import { BLOB_MISSING_MESSAGE, blobConfigured } from '../blob';
import { getConfig, isModelAllowed } from '../env';
import { errorResult, textResult, toolError, warningNote, type ToolContext } from '../gateway';
import { encodeJobId } from '../jobs';
import { findModel } from '../models';
import { estimateResult, estimateVideo, type VideoQuery } from '../pricing';
import { GET_VIDEO_WAIT_S } from './get-video';

type StartOptions = Omit<Parameters<typeof startVideo>[0], 'model' | 'n' | 'providerOptions'> & {
  providerOptions?: Record<string, Record<string, unknown>>;
};

/**
 * Starts an AI Gateway video job and returns its job_id, for every tool that
 * makes a video (start_video, motion_control, upscale_video, edit_video,
 * extend_video). Inputs go by hosted https URL: the Gateway persists the start
 * request (capped at 300 KiB) and the provider fetches the files itself.
 * With `estimate`, nothing starts: the reply is the list price for the request.
 */
export async function startVideoJob(
  tool: string,
  model: string,
  options: StartOptions,
  ctx: ToolContext,
  estimate?: VideoQuery,
): Promise<CallToolResult> {
  if (!isModelAllowed(model)) return errorResult(`Model "${model}" is not in this server's ALLOWED_MODELS list.`);
  // Finished videos can only be handed back through Blob, so refuse before spending credits.
  if (!estimate && !blobConfigured()) return errorResult(BLOB_MISSING_MESSAGE);
  try {
    const info = await findModel(model);
    if (!info) return errorResult(`Unknown model "${model}". Call list_models with type "video" to see video models.`);
    if (info.type !== 'video') return errorResult(`Model "${model}" is not a video model. Call list_models with type "video".`);
    if (estimate) return estimateResult(model, estimateVideo(info, estimate));

    const { providerOptions = {}, ...rest } = options;
    const { providerMetadata, warnings } = await startVideo({
      model: ctx.gateway.videoModel(model),
      n: 1,
      ...rest,
      providerOptions: { ...providerOptions, ...ctx.gatewayOptions(tool) },
    });
    const gatewayJobId = (providerMetadata?.gateway as { asyncJob?: { jobId?: unknown } } | undefined)?.asyncJob?.jobId;
    if (typeof gatewayJobId !== 'string') {
      return errorResult(`AI Gateway accepted the request for "${model}" but returned no job id, so it cannot be tracked.`);
    }

    const jobId = encodeJobId({ model, gatewayJobId }, ctx.keyPrefix);
    const notes = warnings.map(warningNote);
    return textResult(
      [
        `Video job started with ${model}.`,
        `job_id: ${jobId}`,
        `Call get_video with this job_id until it reports done (usually 1–5 minutes). Each call waits up to ${GET_VIDEO_WAIT_S} s, so call it right away. Fetch it soon: the provider's copy expires.`,
        ...notes,
      ].join('\n'),
    );
  } catch (error) {
    return toolError(error, model, 'video');
  }
}

/**
 * For every tool that starts a paid job. A lost reply does not mean the job
 * failed, and a job_id that never arrived cannot be recovered.
 */
export const NO_BLIND_RETRY =
  'If this call times out or returns no answer, do not call it again on your own: the job may already be running and a retry pays twice. Tell the user and let them decide.';

/** Input for the video tools: list price only, nothing starts. */
export const estimateOnly = z
  .boolean()
  .optional()
  .describe("Only return the estimated price from AI Gateway's list prices. Nothing is started or charged.");

/** https only: the provider downloads these itself. */
export const httpsUrl = z.string().url().startsWith('https://', 'Links must start with https://');

/** A reference as the SDK wants it: videos need their media type, since a bare URL does not say. */
export function reference(url: string) {
  const video = /\.(mp4|mov|webm|m4v)(\?|#|$)/i.exec(url);
  if (!video) return url;
  const type = video[1].toLowerCase();
  return { data: url, mediaType: type === 'mov' ? 'video/quicktime' : `video/${type === 'm4v' ? 'mp4' : type}` };
}

export function checkDuration(duration: number | undefined): CallToolResult | undefined {
  const { maxVideoSeconds } = getConfig();
  if (duration && duration > maxVideoSeconds) {
    return errorResult(`duration ${duration}s is above this server's limit of ${maxVideoSeconds}s (MAX_VIDEO_SECONDS).`);
  }
  return undefined;
}

type Args = {
  model: string;
  prompt: string;
  image_url?: string;
  end_image_url?: string;
  reference_urls?: string[];
  duration?: number;
  aspect_ratio?: string;
  sound?: boolean;
  estimate_only?: boolean;
};

export const startVideoTool = {
  name: 'start_video',
  description:
    `Start an asynchronous AI Gateway video and return a job_id immediately. Then call get_video with that job_id until it is done (usually 1–5 minutes); each call waits up to ${GET_VIDEO_WAIT_S} s, so no pause is needed between calls. Text-to-video needs only a prompt. image_url animates a picture (i2v models); add end_image_url to move from the first picture to the last (Veo, Kling, Seedance). reference_urls (pictures or videos of characters or objects) makes a new scene with them (r2v models such as "alibaba/wan-v2.6-r2v": call them character1, character2… in the prompt). For dialogue, write the lines in the prompt and set sound (models with audio, e.g. Veo 3.1, HeyGen). Links must be https; links returned by this server work. ${NO_BLIND_RETRY}`,
  inputSchema: z.object({
    model: z.string().describe('Video model id from list_models with type "video", e.g. "google/veo-3.1-fast-generate-001"'),
    prompt: z.string().min(1),
    image_url: httpsUrl.optional().describe('Start image for image-to-video (i2v)'),
    end_image_url: httpsUrl.optional().describe('Last frame to end on; needs image_url too'),
    reference_urls: z.array(httpsUrl).min(1).max(4).optional().describe('Reference pictures or videos for reference-to-video (r2v)'),
    duration: z.number().int().positive().optional().describe('Length in seconds; supported values vary by model'),
    aspect_ratio: z.string().regex(/^\d+:\d+$/).optional().describe('e.g. "16:9" or "9:16"'),
    sound: z.boolean().optional().describe('Generate audio with the video (models that support it). Costs more on some models.'),
    estimate_only: estimateOnly,
  }),
  async run({ model, prompt, image_url, end_image_url, reference_urls, duration, aspect_ratio, sound, estimate_only }: Args, ctx: ToolContext) {
    const tooLong = checkDuration(duration);
    if (tooLong) return tooLong;
    if (end_image_url && !image_url) return errorResult('end_image_url needs image_url as the first frame.');
    if (reference_urls && image_url) return errorResult('Use either image_url (animate a picture) or reference_urls (new scene with these characters), not both.');
    const seconds = duration ?? Math.min(getConfig().maxVideoSeconds, 8);
    const mode = image_url ? 'image_to_video' : reference_urls ? 'reference_to_video' : 'text_to_video';

    return startVideoJob(
      'start_video',
      model,
      {
        prompt: image_url && !end_image_url ? { image: image_url, text: prompt } : prompt,
        ...(end_image_url && image_url
          ? {
              frameImages: [
                { image: image_url, frameType: 'first_frame' as const },
                { image: end_image_url, frameType: 'last_frame' as const },
              ],
            }
          : {}),
        ...(reference_urls ? { inputReferences: reference_urls.map(reference) } : {}),
        duration: seconds,
        aspectRatio: aspect_ratio as `${number}:${number}` | undefined,
        generateAudio: sound,
      },
      ctx,
      estimate_only ? { seconds, audio: sound, mode } : undefined,
    );
  },
};
