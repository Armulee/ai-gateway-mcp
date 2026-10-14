import { z } from 'zod';
import { getConfig } from '../env';
import { errorResult, type ToolContext } from '../gateway';
import { checkDuration, httpsUrl, reference, startVideoJob } from './start-video';

// Video tools that start from existing media. Each starts an AI Gateway job and
// returns a job_id for get_video, like start_video. Their output length follows
// the input video, which MAX_VIDEO_SECONDS cannot see in advance; the AI
// Gateway budget remains the real cap. Shapes follow Vercel's video docs
// (motion control, video editing, video extension) and the Topaz model page.

const MOTION_MODEL = 'klingai/kling-v3.0-motion-control';

export const motionControlTool = {
  name: 'motion_control',
  description: `Make the character in a picture move like the person in a reference video (a dance, a gesture, a walk). Uses "${MOTION_MODEL}" by default. The result is as long as the reference video: up to 10 seconds with orientation "image" (the default). Returns a job_id for get_video. Links must be https; links returned by this server work.`,
  inputSchema: z.object({
    image_url: httpsUrl.describe('The character: a .jpg or .png, at most 10 MB'),
    video_url: httpsUrl.describe('The motion to copy: an .mp4 or .mov, at least 3 seconds, at most 100 MB'),
    prompt: z.string().optional().describe('Optional scene or camera notes'),
    orientation: z.enum(['image', 'video']).optional().describe('Face the way the picture does ("image", up to 10 s) or the way the video does ("video", up to 30 s). Default "image".'),
    quality: z.enum(['std', 'pro']).optional().describe('"std" (default) or "pro" (costs more)'),
    keep_sound: z.boolean().optional().describe("Keep the reference video's sound. Default true."),
    model: z.string().optional().describe(`A motion-control model id. Default "${MOTION_MODEL}".`),
  }),
  async run(
    args: { image_url: string; video_url: string; prompt?: string; orientation?: 'image' | 'video'; quality?: 'std' | 'pro'; keep_sound?: boolean; model?: string },
    ctx: ToolContext,
  ) {
    const model = args.model ?? MOTION_MODEL;
    if (!model.startsWith('klingai/') || !model.includes('motion-control')) {
      return errorResult(`motion_control works with Kling motion-control models, e.g. "${MOTION_MODEL}". "${model}" is not one.`);
    }
    const orientation = args.orientation ?? 'image';
    // "video" orientation allows 30-second results, so only when the owner allows that length.
    if (orientation === 'video' && getConfig().maxVideoSeconds < 30) {
      return errorResult(`orientation "video" can make clips up to 30 seconds, above this server's limit of ${getConfig().maxVideoSeconds}s (MAX_VIDEO_SECONDS). Use orientation "image" (up to 10 s).`);
    }
    return startVideoJob(
      'motion_control',
      model,
      {
        prompt: { image: args.image_url, text: args.prompt ?? '' },
        providerOptions: {
          klingai: {
            videoUrl: args.video_url,
            characterOrientation: orientation,
            mode: args.quality ?? 'std',
            keepOriginalSound: args.keep_sound === false ? 'no' : 'yes',
          },
        },
      },
      ctx,
    );
  },
};

const UPSCALE_MODEL = 'topaz/proteus';

export const upscaleVideoTool = {
  name: 'upscale_video',
  description: `Make a video sharper and larger, and clean up noise, blur and compression. Uses "${UPSCALE_MODEL}" (Topaz) by default; "topaz/starlight-precise-2.6" is the other choice. Priced by the length of the input video. Returns a job_id for get_video. Links must be https; links returned by this server work.`,
  inputSchema: z.object({
    video_url: httpsUrl.describe('The video to upscale (.mp4, .mov or .webm link)'),
    resolution: z.string().regex(/^\d+x\d+$/).optional().describe('Output size like "1920x1080" (default) or "3840x2160"'),
    model: z.string().optional().describe(`Default "${UPSCALE_MODEL}"`),
  }),
  async run({ video_url, resolution = '1920x1080', model = UPSCALE_MODEL }: { video_url: string; resolution?: string; model?: string }, ctx: ToolContext) {
    const input = reference(video_url);
    return startVideoJob(
      'upscale_video',
      model,
      {
        prompt: '',
        inputReferences: [typeof input === 'string' ? { data: video_url, mediaType: 'video/mp4' } : input],
        resolution: resolution as `${number}x${number}`,
      },
      ctx,
    );
  },
};

const GROK_VIDEO = 'spacexai/grok-imagine-video';
const grokOnly = (model: string, tool: string) =>
  model.startsWith('spacexai/grok-imagine-video') ? undefined : errorResult(`${tool} works with Grok Imagine Video models, e.g. "${GROK_VIDEO}". "${model}" is not one.`);

export const editVideoTool = {
  name: 'edit_video',
  description: `Change an existing video with an instruction, like "give the person sunglasses" or "make it snow". Uses "${GROK_VIDEO}". The result keeps the input's length and shape, at up to 720p. Returns a job_id for get_video. Links must be https; links returned by this server work.`,
  inputSchema: z.object({
    video_url: httpsUrl.describe('The video to change'),
    prompt: z.string().min(1).describe('What to change'),
    model: z.string().optional().describe(`A Grok Imagine Video model id. Default "${GROK_VIDEO}".`),
  }),
  async run({ video_url, prompt, model = GROK_VIDEO }: { video_url: string; prompt: string; model?: string }, ctx: ToolContext) {
    const wrong = grokOnly(model, 'edit_video');
    if (wrong) return wrong;
    return startVideoJob('edit_video', model, { prompt, providerOptions: { spacexai: { videoUrl: video_url } } }, ctx);
  },
};

export const extendVideoTool = {
  name: 'extend_video',
  description: `Continue a video from its last frame, so a scene keeps going ("the cat jumps off the windowsill"). Uses "${GROK_VIDEO}". Returns a job_id for get_video; the result is the new part. Links must be https; links returned by this server work.`,
  inputSchema: z.object({
    video_url: httpsUrl.describe('The video to continue'),
    prompt: z.string().min(1).describe('What happens next'),
    duration: z.number().int().positive().optional().describe('Seconds to add'),
    model: z.string().optional().describe(`A Grok Imagine Video model id. Default "${GROK_VIDEO}".`),
  }),
  async run({ video_url, prompt, duration, model = GROK_VIDEO }: { video_url: string; prompt: string; duration?: number; model?: string }, ctx: ToolContext) {
    const wrong = grokOnly(model, 'extend_video');
    if (wrong) return wrong;
    const tooLong = checkDuration(duration);
    if (tooLong) return tooLong;
    return startVideoJob(
      'extend_video',
      model,
      {
        prompt,
        duration: duration ?? Math.min(getConfig().maxVideoSeconds, 6),
        providerOptions: { spacexai: { mode: 'extend-video', videoUrl: video_url } },
      },
      ctx,
    );
  },
};
