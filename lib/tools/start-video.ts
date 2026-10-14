import { experimental_startVideo as startVideo } from 'ai';
import { z } from 'zod';
import { BLOB_MISSING_MESSAGE, blobConfigured } from '../blob';
import { getConfig, isModelAllowed } from '../env';
import { errorResult, textResult, toolError, type ToolContext } from '../gateway';
import { encodeJobId } from '../jobs';
import { findModel } from '../models';

type Args = { model: string; prompt: string; image_url?: string; duration?: number; aspect_ratio?: string };

export const startVideoTool = {
  name: 'start_video',
  description:
    'Start an asynchronous AI Gateway video generation and return a job_id immediately. Then call get_video with that job_id every ~30 seconds until it is done (usually 1–5 minutes). Pass image_url (a public https URL) for image-to-video models.',
  inputSchema: z.object({
    model: z.string().describe('Video model id from list_models with type "video", e.g. "google/veo-3.1-fast-generate-001"'),
    prompt: z.string().min(1),
    image_url: z.string().url().optional().describe('https URL of a start image for image-to-video (i2v) models'),
    duration: z.number().int().positive().optional().describe('Length in seconds; supported values vary by model'),
    aspect_ratio: z.string().regex(/^\d+:\d+$/).optional().describe('e.g. "16:9" or "9:16"'),
  }),
  async run({ model, prompt, image_url, duration, aspect_ratio }: Args, ctx: ToolContext) {
    if (!isModelAllowed(model)) return errorResult(`Model "${model}" is not in this server's ALLOWED_MODELS list.`);
    // Finished videos can only be handed back through Blob, so refuse before spending credits.
    if (!blobConfigured()) return errorResult(BLOB_MISSING_MESSAGE);
    const { maxVideoSeconds } = getConfig();
    if (duration && duration > maxVideoSeconds) {
      return errorResult(`duration ${duration}s is above this server's limit of ${maxVideoSeconds}s (MAX_VIDEO_SECONDS).`);
    }
    if (image_url && !image_url.startsWith('https://')) return errorResult('image_url must be an https URL.');

    try {
      const info = await findModel(model);
      if (!info) return errorResult(`Unknown model "${model}". Call list_models with type "video" to see video models.`);
      if (info.type !== 'video') return errorResult(`Model "${model}" is not a video model. Call list_models with type "video".`);

      const { providerMetadata } = await startVideo({
        model: ctx.gateway.videoModel(model),
        prompt: image_url ? { image: image_url, text: prompt } : prompt,
        n: 1,
        duration: duration ?? Math.min(maxVideoSeconds, 8),
        aspectRatio: aspect_ratio as `${number}:${number}` | undefined,
      });
      const gatewayJobId = (providerMetadata?.gateway as { asyncJob?: { jobId?: unknown } } | undefined)?.asyncJob?.jobId;
      if (typeof gatewayJobId !== 'string') {
        return errorResult(`AI Gateway accepted the request for "${model}" but returned no job id, so it cannot be tracked.`);
      }

      const jobId = encodeJobId({ model, gatewayJobId }, ctx.keyPrefix);
      return textResult(
        `Video job started with ${model}.\njob_id: ${jobId}\nCall get_video with this job_id in about 30 seconds, and again until it reports done. Fetch it soon: the provider's copy expires.`,
      );
    } catch (error) {
      return toolError(error, model, 'video');
    }
  },
};
