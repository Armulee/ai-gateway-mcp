import { list, type ListBlobResultBlob } from '@vercel/blob';
import { z } from 'zod';
import { BLOB_MISSING_MESSAGE, blobConfigured, signedUrl } from '../blob';
import { errorResult, STATS_TAG, textResult, toolError, type ToolContext } from '../gateway';
import { PAID_PLAN_NOTE, readSpend } from '../stats';
import type { MediaKind, MediaView } from '../ui/media-types';

const usd = (n: number) => `$${n.toFixed(2)}`;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export const checkCreditsTool = {
  name: 'check_credits',
  description:
    "Show how many AI Gateway credits are left on this Vercel team, and what this connector spent in the last 30 days. Use it before big jobs (many videos) to check there is enough.",
  inputSchema: z.object({}),
  async run(_args: Record<string, never>, ctx: ToolContext) {
    try {
      const end = new Date();
      const start = new Date(end.getTime() - 29 * 86_400_000);
      const [credits, spend] = await Promise.all([
        ctx.gateway.getCredits().then(
          (value) => ({ ok: true as const, value }),
          (reason: unknown) => ({ ok: false as const, reason }),
        ),
        readSpend(ctx.gateway, { startDate: isoDay(start), endDate: isoDay(end), tags: [STATS_TAG], groupBy: 'day' }),
      ]);
      if (!credits.ok) return toolError(credits.reason, 'AI Gateway credits', 'credits');

      const lines = [
        `AI Gateway credits left: ${usd(Number(credits.value.balance))} (used so far: ${usd(Number(credits.value.totalUsed))}). Credits belong to the whole Vercel team.`,
      ];
      if (spend.ok) {
        const total = spend.rows.reduce((sum, row) => sum + row.totalCost, 0);
        const requests = spend.rows.reduce((sum, row) => sum + (row.requestCount ?? 0), 0);
        lines.push(`This connector, last 30 days: ${usd(total)} over ${requests} request(s).`);
      } else if (spend.reason === 'paid-plan') {
        lines.push(`${PAID_PLAN_NOTE} Each tool reply shows what that call cost, and the Vercel dashboard (AI Gateway → Usage) shows the team's totals.`);
      } else {
        lines.push("This connector's own spend could not be read; the Vercel dashboard (AI Gateway → Usage) has it.");
      }
      lines.push('The spending cap is the AI Gateway budget (Vercel dashboard: AI Gateway → Budgets; a project budget caps just this connector).');
      return textResult(lines.join('\n'));
    } catch (error) {
      return toolError(error, 'AI Gateway credits', 'credits');
    }
  },
};

const FOLDERS = { image: 'images/', video: 'videos/', audio: 'audio/' } as const;
type Kind = keyof typeof FOLDERS;
const MAX_LISTED = 5000;

export const listFilesTool = {
  name: 'list_files',
  description:
    'List pictures, videos and audio this connector made before, newest first, with fresh private links (they expire). Needs a connected Blob store.',
  inputSchema: z.object({
    kind: z.enum(['image', 'video', 'audio']).optional().describe('Only this kind of file'),
    limit: z.number().int().positive().max(30).optional().describe('How many to return, newest first. Default 10.'),
  }),
  async run({ kind, limit = 10 }: { kind?: Kind; limit?: number }, _ctx: ToolContext) {
    if (!blobConfigured()) return errorResult(BLOB_MISSING_MESSAGE);
    try {
      // Paths are random, so the store lists them in no useful order: read them all, then sort by date.
      const blobs: ListBlobResultBlob[] = [];
      for (const prefix of kind ? [FOLDERS[kind]] : Object.values(FOLDERS)) {
        let cursor: string | undefined;
        do {
          const page = await list({ prefix, cursor, limit: 1000 });
          blobs.push(...page.blobs);
          cursor = page.hasMore ? page.cursor : undefined;
        } while (cursor && blobs.length < MAX_LISTED);
      }
      if (blobs.length === 0) return textResult(kind ? `No ${kind} files yet.` : 'No files yet.');

      const newest = blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()).slice(0, limit);
      const view: MediaView = { source: 'files', items: [] };
      const lines = await Promise.all(
        newest.map(async (blob, i) => {
          const { url, expiresAt } = await signedUrl(blob.pathname);
          const sizeKb = Math.max(1, Math.round(blob.size / 1024));
          const folder = blob.pathname.split('/')[0];
          const kind = (Object.keys(FOLDERS) as Kind[]).find((k) => FOLDERS[k] === `${folder}/`) ?? 'image';
          view.items[i] = { kind: kind as MediaKind, url, expiresAt, sizeKb, uploadedAt: blob.uploadedAt.toISOString() };
          return `${blob.uploadedAt.toISOString().slice(0, 16).replace('T', ' ')} | ${folder} | ${sizeKb} KB | ${url} (expires ${expiresAt})`;
        }),
      );
      return {
        ...textResult(`${newest.length} of ${blobs.length} file(s), newest first. date | folder | size | link\n${lines.join('\n')}`),
        structuredContent: view,
      };
    } catch (error) {
      return toolError(error, 'Blob store', 'files');
    }
  },
};
