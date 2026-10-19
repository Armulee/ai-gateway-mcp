import type { CallToolResult } from '@modelcontextprotocol/server';
import { experimental_startVideo as startVideo } from 'ai';
import { z } from 'zod';
import { BLOB_MISSING_MESSAGE, blobConfigured } from '../blob';
import { getConfig, isModelAllowed } from '../env';
import { errorResult, textResult, toolError, warningNote, type ToolContext } from '../gateway';
import { encodeJobId } from '../jobs';
import { capabilitiesOf, fetchModels, findModel, type GatewayModel } from '../models';
import { estimateResult, estimateVideo, money, type VideoQuery } from '../pricing';
import {
  describeSeconds,
  fitSeconds,
  minSeconds,
  rateAt,
  RESOLUTIONS,
  resolutionsOf,
  secondsAllowed,
  secondsOf,
  sizeOf,
  type Resolution,
} from '../video-specs';
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

    const jobId = encodeJobId({ model, gatewayJobId, startedAt: Math.floor(Date.now() / 1000) }, ctx.keyPrefix);
    const notes = warnings.map(warningNote);
    return textResult(
      [
        `Video job started with ${model}.`,
        `job_id: ${jobId}`,
        `Call get_video with this job_id right away (usually done in 1–5 minutes). Each call waits up to ${GET_VIDEO_WAIT_S} s, so there is no need to pause. If get_video says to stop checking, stop and tell the user; check again only when they ask. Fetch it soon: the provider's copy expires.`,
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
  'If this call times out or returns no answer, do not call it again on your own: the job may already be running and a retry pays twice. Tell the user and let them decide. If the user declines this call, do not call it again, with these or other arguments, unless they ask.';

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
  resolution?: Resolution;
  sound?: boolean;
  estimate_only?: boolean;
};

type Mode = 'text_to_video' | 'image_to_video' | 'reference_to_video';
const CAPABILITY: Record<Mode, string> = { text_to_video: 't2v', image_to_video: 'i2v', reference_to_video: 'r2v' };
const MODE_NAME: Record<Mode, string> = { text_to_video: 'from text', image_to_video: 'from a picture', reference_to_video: 'from references' };
const NOT_STARTED = 'Nothing was generated or charged. Tell the user before generating anything.';

/** One option line: rate at a resolution, plus the shortest clip and its price when the lengths are known. */
function optionLine(model: GatewayModel, resolution: Resolution, audio?: boolean): string {
  const rate = rateAt(model, resolution, audio);
  const price = rate !== undefined ? `${money(rate)}/s` : 'no per-second list price';
  const allowed = secondsOf(model);
  const shortest = allowed
    ? `; ${describeSeconds(allowed)}, shortest ${minSeconds(allowed)} s${rate !== undefined ? ` = ${money(rate * minSeconds(allowed))}` : ''}`
    : '; lengths not documented';
  return `${model.id} at ${resolution}: ${price}${shortest}`;
}

/** Up to five other models that can make this kind of video at `resolution` (or at any chosen resolution), cheapest first. */
async function alternatives(exclude: string, mode: Mode, resolution: Resolution | undefined, audio?: boolean): Promise<string> {
  const found = (await fetchModels())
    .filter((m) => m.type === 'video' && m.id !== exclude && isModelAllowed(m.id) && capabilitiesOf(m).includes(CAPABILITY[mode]))
    .flatMap((m) => {
      const offered = resolutionsOf(m);
      const pick = resolution ?? offered.find((r) => rateAt(m, r, audio) !== undefined) ?? offered[0];
      if (!pick || !offered.includes(pick)) return [];
      return [{ m, pick, rate: rateAt(m, pick, audio) ?? Infinity }];
    })
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 5);
  if (found.length === 0) return `No other model here can make a video ${MODE_NAME[mode]}${resolution ? ` at ${resolution}` : ' with a chosen resolution'}.`;
  return [`Models that can${resolution ? ` make ${resolution}` : ' choose the resolution'} ${MODE_NAME[mode]}, cheapest first:`, ...found.map(({ m, pick }) => `- ${optionLine(m, pick, audio)}`)].join('\n');
}

/**
 * Checks the resolution and length against what the model documents, before
 * anything is spent. A refusal names what the model does offer, its shortest
 * clip and price, and other models that can do what was asked.
 */
async function checkOptions(info: GatewayModel, mode: Mode, resolution: Resolution | undefined, duration: number | undefined, audio?: boolean) {
  const allowed = secondsOf(info);
  if (duration !== undefined && allowed && !secondsAllowed(allowed, duration)) {
    return errorResult(`"${info.id}" makes clips of ${describeSeconds(allowed)}, so ${duration} s is not possible; the shortest is ${minSeconds(allowed)} s. ${NOT_STARTED}`);
  }
  if (allowed && minSeconds(allowed) > getConfig().maxVideoSeconds) {
    return errorResult(`"${info.id}" makes clips of at least ${minSeconds(allowed)} s, above this server's limit of ${getConfig().maxVideoSeconds}s (MAX_VIDEO_SECONDS). ${NOT_STARTED}`);
  }
  if (!resolution) return undefined;
  const offered = resolutionsOf(info);
  if (offered.length === 0) {
    return errorResult(
      [`"${info.id}" does not let you choose the resolution; it always uses its own. ${NOT_STARTED} Suggest one of these instead:`, await alternatives(info.id, mode, resolution, audio)].join('\n'),
    );
  }
  if (!offered.includes(resolution)) {
    return errorResult(
      [
        `"${info.id}" does not offer ${resolution}. ${NOT_STARTED} What it offers:`,
        ...offered.map((r) => `- ${optionLine(info, r, audio)}`),
        await alternatives(info.id, mode, resolution, audio),
      ].join('\n'),
    );
  }
  return undefined;
}

export const startVideoTool = {
  name: 'start_video',
  description:
    `Start an asynchronous AI Gateway video and return a job_id immediately. Then call get_video with that job_id (usually done in 1–5 minutes); each call waits up to ${GET_VIDEO_WAIT_S} s, so no pause is needed between calls, and when it says to stop checking, stop and tell the user. Set resolution (480p, 720p, 1080p, 4k) to pick the size and price; only some models allow it (list_models shows each model's resolutions and lengths), and a model that can't make the asked resolution or length is refused before anything is charged, with alternatives to offer the user. Before a paid run, tell the user the length and price; estimate_only gives the model's shortest clip and its price. Text-to-video needs only a prompt. image_url animates a picture (i2v models); add end_image_url to move from the first picture to the last (Veo, Kling, Seedance). reference_urls (pictures or videos of characters or objects) makes a new scene with them (r2v models such as "alibaba/wan-v2.6-r2v": call them character1, character2… in the prompt). For dialogue, write the lines in the prompt and set sound (models with audio, e.g. Veo 3.1, HeyGen). Links must be https; links returned by this server work. ${NO_BLIND_RETRY}`,
  inputSchema: z.object({
    model: z.string().describe('Video model id from list_models with type "video", e.g. "google/veo-3.1-fast-generate-001"'),
    prompt: z.string().min(1),
    image_url: httpsUrl.optional().describe('Start image for image-to-video (i2v)'),
    end_image_url: httpsUrl.optional().describe('Last frame to end on; needs image_url too'),
    reference_urls: z.array(httpsUrl).min(1).max(4).optional().describe('Reference pictures or videos for reference-to-video (r2v)'),
    duration: z.number().int().positive().optional().describe('Length in seconds; supported values vary by model'),
    aspect_ratio: z.string().regex(/^\d+:\d+$/).optional().describe('e.g. "16:9" or "9:16"'),
    resolution: z.enum(RESOLUTIONS as [Resolution, ...Resolution[]]).optional().describe('Output size. Lower is cheaper. Only some models let you choose; list_models shows which.'),
    sound: z.boolean().optional().describe('Generate audio with the video (models that support it). Costs more on some models.'),
    estimate_only: estimateOnly,
  }),
  async run({ model, prompt, image_url, end_image_url, reference_urls, duration, aspect_ratio, resolution, sound, estimate_only }: Args, ctx: ToolContext) {
    const tooLong = checkDuration(duration);
    if (tooLong) return tooLong;
    if (end_image_url && !image_url) return errorResult('end_image_url needs image_url as the first frame.');
    if (reference_urls && image_url) return errorResult('Use either image_url (animate a picture) or reference_urls (new scene with these characters), not both.');
    const mode: Mode = image_url ? 'image_to_video' : reference_urls ? 'reference_to_video' : 'text_to_video';

    // Unknown or non-video models are reported by startVideoJob.
    const info = isModelAllowed(model) ? await findModel(model).catch(() => undefined) : undefined;
    const isVideo = info?.type === 'video';
    if (isVideo) {
      const refused = await checkOptions(info, mode, resolution, duration, sound);
      if (refused) return refused;
    }
    const { maxVideoSeconds } = getConfig();
    const allowed = isVideo ? secondsOf(info) : undefined;
    const fallback = Math.min(maxVideoSeconds, 8);
    const seconds = duration ?? (allowed ? fitSeconds(allowed, fallback, maxVideoSeconds) : fallback);
    const size = isVideo && resolution ? sizeOf(info, resolution) : undefined;

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
        ...(size ? { resolution: size } : {}),
        generateAudio: sound,
      },
      ctx,
      estimate_only ? { seconds, audio: sound, mode, resolution, lengthAndResolution: true } : undefined,
    );
  },
};
