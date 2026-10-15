import { gateway, type GatewaySpendReportRow } from '@ai-sdk/gateway';
import { STATS_TAG } from './gateway';
import { fetchModels } from './models';

// Usage for the setup page. Every call from this MCP is tagged (see
// gatewayOptions in lib/gateway.ts), so AI Gateway's own spend report can be
// filtered to this connector. No database: the numbers come from Vercel.

export type Usage = { cost: number; requests: number };
export type Stats = {
  /** Whole team (AI Gateway credits are per team, not per project). */
  credits: { balance: number; totalUsed: number } | null;
  /** This connector, last 30 days, oldest first, one entry per day. */
  days: (Usage & { day: string })[] | null;
  /** `name` is the catalog's display name, when the catalog has the model. */
  models: (Usage & { model: string; name?: string })[] | null;
  apps: (Usage & { app: string })[] | null;
  /** Readable notes for whatever could not be loaded. */
  problems: string[];
  generatedAt: string;
};

const DAYS = 30;
const CACHE_MS = 60 * 1000;
let cache: { at: number; stats: Stats } | undefined;

const APP_NAMES: Record<string, string> = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  cursor: 'Cursor',
  vscode: 'VS Code',
  other: 'Other apps',
};

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const usage = (row: GatewaySpendReportRow): Usage => ({ cost: row.totalCost, requests: row.requestCount ?? 0 });

export async function getStats(): Promise<Stats> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.stats;

  const end = new Date();
  const start = new Date(end.getTime() - (DAYS - 1) * 86_400_000);
  const range = { startDate: isoDay(start), endDate: isoDay(end), tags: [STATS_TAG] };
  const [credits, byDay, byModel, byTag, catalog] = await Promise.allSettled([
    gateway.getCredits(),
    gateway.getSpendReport({ ...range, groupBy: 'day' }),
    gateway.getSpendReport({ ...range, groupBy: 'model' }),
    gateway.getSpendReport({ ...range, groupBy: 'tag' }),
    fetchModels(),
  ]);
  // Display names are a nicety: without the catalog the ids still show.
  const names = new Map(catalog.status === 'fulfilled' ? catalog.value.map((m) => [m.id, m.name]) : []);

  const problems: string[] = [];
  if (credits.status === 'rejected') problems.push('Could not read your AI Gateway credits.');
  const reportFailed = [byDay, byModel, byTag].some((r) => r.status === 'rejected');
  if (reportFailed) problems.push('Could not read the AI Gateway usage report. The Vercel dashboard (AI Gateway → Usage) has the same numbers.');

  let days: Stats['days'] = null;
  if (byDay.status === 'fulfilled') {
    const spent = new Map(byDay.value.results.map((row) => [(row.day ?? '').slice(0, 10), usage(row)]));
    days = Array.from({ length: DAYS }, (_, i) => {
      const day = isoDay(new Date(start.getTime() + i * 86_400_000));
      return { day, ...(spent.get(day) ?? { cost: 0, requests: 0 }) };
    });
  }

  const models =
    byModel.status === 'fulfilled'
      ? byModel.value.results
          .filter((row) => row.model)
          .map((row) => ({ model: row.model!, name: names.get(row.model!), ...usage(row) }))
          .sort((a, b) => b.cost - a.cost)
      : null;

  const apps =
    byTag.status === 'fulfilled'
      ? byTag.value.results
          .filter((row) => row.tag?.startsWith('client:'))
          .map((row) => {
            const id = row.tag!.slice('client:'.length);
            return { app: APP_NAMES[id] ?? id, ...usage(row) };
          })
          .sort((a, b) => b.cost - a.cost)
      : null;

  const stats: Stats = {
    credits:
      credits.status === 'fulfilled'
        ? { balance: Number(credits.value.balance), totalUsed: Number(credits.value.totalUsed) }
        : null,
    days,
    models,
    apps,
    problems,
    generatedAt: new Date().toISOString(),
  };
  // Do not keep a failure around: the next view should try again.
  if (problems.length === 0) cache = { at: Date.now(), stats };
  return stats;
}
