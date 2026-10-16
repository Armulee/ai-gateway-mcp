import { gateway, GatewayForbiddenError, type GatewayProvider, type GatewaySpendReportParams, type GatewaySpendReportRow } from '@ai-sdk/gateway';
import { STATS_TAG } from './gateway';
import { fetchModels } from './models';
export { PAID_PLAN_NOTE } from './site';

// Usage for the setup page. Every call from this MCP is tagged (see
// gatewayOptions in lib/gateway.ts), so AI Gateway's own spend report can be
// filtered to this connector. No database: the numbers come from Vercel.
//
// The report is a paid-plan feature: on Hobby it answers 403 "Spend report
// access requires a paid plan" (credits still work). Keeping our own log in
// Blob was ruled out: Hobby includes 2,000 Blob advanced operations a month,
// shared with media uploads, and going over blocks Blob for 30 days.

export type Spend = { ok: true; rows: GatewaySpendReportRow[] } | { ok: false; reason: 'paid-plan' | 'error' };

/** Reads the spend report, logging the real failure (status and message; the report URL holds no secret). */
export async function readSpend(provider: GatewayProvider, params: GatewaySpendReportParams): Promise<Spend> {
  try {
    return { ok: true, rows: (await provider.getSpendReport(params)).results };
  } catch (error) {
    const { statusCode, message } = error as { statusCode?: number; message?: string };
    console.warn('[usage] spend report failed', statusCode ?? '-', String(message ?? error).slice(0, 300));
    const paidPlan = (GatewayForbiddenError.isInstance(error) || statusCode === 403) && /paid plan/i.test(String(message));
    return { ok: false, reason: paidPlan ? 'paid-plan' : 'error' };
  }
}

export type Usage = { cost: number; requests: number };
export type Stats = {
  /** Whole team (AI Gateway credits are per team, not per project). */
  credits: { balance: number; totalUsed: number } | null;
  /** This connector, last 30 days, oldest first, one entry per day. */
  days: (Usage & { day: string })[] | null;
  /** `name` is the catalog's display name, when the catalog has the model. */
  models: (Usage & { model: string; name?: string })[] | null;
  apps: (Usage & { app: string })[] | null;
  /** The team's plan has no usage report, so days, models and apps are null. */
  paidPlanOnly: boolean;
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
  const [credits, byDay, catalog] = await Promise.allSettled([gateway.getCredits(), readSpend(gateway, { ...range, groupBy: 'day' }), fetchModels()]);
  const daySpend: Spend = byDay.status === 'fulfilled' ? byDay.value : { ok: false, reason: 'error' };
  // Without the report there is no point asking twice more.
  const [byModel, byTag]: Spend[] = daySpend.ok
    ? await Promise.all([readSpend(gateway, { ...range, groupBy: 'model' }), readSpend(gateway, { ...range, groupBy: 'tag' })])
    : [daySpend, daySpend];
  // Display names are a nicety: without the catalog the ids still show.
  const names = new Map(catalog.status === 'fulfilled' ? catalog.value.map((m) => [m.id, m.name]) : []);

  const problems: string[] = [];
  if (credits.status === 'rejected') problems.push('Could not read your AI Gateway credits.');
  const paidPlanOnly = [daySpend, byModel, byTag].some((r) => !r.ok && r.reason === 'paid-plan');
  if (!paidPlanOnly && [daySpend, byModel, byTag].some((r) => !r.ok)) {
    problems.push('Could not read the AI Gateway usage report. The Vercel dashboard (AI Gateway → Usage) has the same numbers.');
  }

  let days: Stats['days'] = null;
  if (daySpend.ok) {
    const spent = new Map(daySpend.rows.map((row) => [(row.day ?? '').slice(0, 10), usage(row)]));
    days = Array.from({ length: DAYS }, (_, i) => {
      const day = isoDay(new Date(start.getTime() + i * 86_400_000));
      return { day, ...(spent.get(day) ?? { cost: 0, requests: 0 }) };
    });
  }

  const models =
    byModel.ok
      ? byModel.rows
          .filter((row) => row.model)
          .map((row) => ({ model: row.model!, name: names.get(row.model!), ...usage(row) }))
          .sort((a, b) => b.cost - a.cost)
      : null;

  const apps =
    byTag.ok
      ? byTag.rows
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
    paidPlanOnly,
    problems,
    generatedAt: new Date().toISOString(),
  };
  // Do not keep a failure around: the next view should try again.
  if (problems.length === 0) cache = { at: Date.now(), stats };
  return stats;
}
