import { experimental_getVideoStatus as getVideoStatus } from 'ai';
import { z } from 'zod';
import { BLOB_MISSING_MESSAGE, blobConfigured, exists, extensionFor, saveMedia, signedUrl } from '../blob';
import { billedCost, errorResult, textResult, toolError, type ToolContext } from '../gateway';
import { decodeJobId, videoPath, type VideoJob } from '../jobs';

type VideoData =
  | { type: 'url'; url: string; mediaType: string }
  | { type: 'base64'; data: string; mediaType: string }
  | { type: 'binary'; data: Uint8Array; mediaType: string };

async function readBytes(video: VideoData): Promise<Buffer> {
  if (video.type === 'base64') return Buffer.from(video.data, 'base64');
  if (video.type === 'binary') return Buffer.from(video.data);
  const res = await fetch(video.url);
  if (!res.ok) throw new Error(`Downloading the finished video failed with HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function linksMessage(job: VideoJob, pathnames: string[], cost?: number) {
  const lines = [`Video ready (${job.model})${cost != null ? `, cost: $${cost}` : ''}.`];
  for (const [i, pathname] of pathnames.entries()) {
    const { url, expiresAt } = await signedUrl(pathname);
    lines.push(`Video ${i + 1}: ${url} (link expires ${expiresAt}; call get_video again for a fresh link)`);
  }
  return textResult(lines.join('\n'));
}

export const getVideoTool = {
  name: 'get_video',
  description:
    'Check a video job from start_video, motion_control, upscale_video, edit_video or extend_video. Returns "still generating" or, when done, what AI Gateway billed and private download links (they expire; calling again issues fresh links).',
  inputSchema: z.object({
    job_id: z.string().min(1).describe('The job_id returned by a video tool'),
  }),
  async run({ job_id }: { job_id: string }, ctx: ToolContext) {
    if (!blobConfigured()) return errorResult(BLOB_MISSING_MESSAGE);
    const job = decodeJobId(job_id, ctx.keyPrefix);
    if (!job) {
      return errorResult('This job_id is not valid for this server. It may be mistyped, or MCP_SECRET was rotated after the job started.');
    }

    try {
      // Already stored by an earlier call: just issue a fresh link.
      const stored = videoPath(job, 0, 'mp4', ctx.keyPrefix);
      if (await exists(stored)) return linksMessage(job, [stored]);

      const status = await getVideoStatus(ctx.gateway.videoModel(job.model), {
        operation: { gatewayJobId: job.gatewayJobId },
      });
      if (status.status === 'pending') {
        return textResult(`Still generating with ${job.model}. Call get_video again in about 30 seconds.`);
      }
      if (status.status === 'error') {
        return errorResult(`Video generation with "${job.model}" failed: ${status.error}`);
      }

      const pathnames: string[] = [];
      for (const [i, video] of (status.videos as VideoData[]).entries()) {
        const mediaType = video.mediaType || 'video/mp4';
        const pathname = videoPath(job, i, extensionFor(mediaType), ctx.keyPrefix);
        if (!(await exists(pathname))) await saveMedia(pathname, await readBytes(video), mediaType);
        pathnames.push(pathname);
      }
      if (pathnames.length === 0) return errorResult(`"${job.model}" finished but returned no video.`);
      // Only known the first time: a stored video is answered without asking the Gateway again.
      const cost = await billedCost(ctx, (status.providerMetadata?.gateway as { generationId?: unknown } | undefined)?.generationId);
      return linksMessage(job, pathnames, cost);
    } catch (error) {
      return toolError(error, job.model, 'video');
    }
  },
};
