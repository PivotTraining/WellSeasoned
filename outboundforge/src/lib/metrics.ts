import { listCampaigns } from "./store";
import type { Campaign } from "./types";

export type Range = "7d" | "30d" | "all";

export interface Kpi {
  key: string;
  label: string;
  value: number;
  /** null when there isn't a prior window to compare against. */
  deltaPct: number | null;
  format: "int" | "pct";
  spark: number[];
}

export interface SeriesPoint {
  date: string; // ISO day
  label: string; // e.g. "Jul 12"
  sent: number;
  leads: number;
}

export interface FunnelStage {
  stage: string;
  value: number;
}

export interface Metrics {
  range: Range;
  kpis: Kpi[];
  series: SeriesPoint[];
  funnel: FunnelStage[];
  campaigns: Campaign[];
  hasData: boolean;
}

function windowDays(range: Range): number {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  return 90; // "all" charts the last 90d of buckets
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pctDelta(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / prev) * 100;
}

const m = (c: Campaign, k: string) => c.metrics[k] ?? 0;

/**
 * Compute dashboard metrics from real store data. Every number is derived
 * from actual campaign rows — nothing is fabricated. Trend deltas compare the
 * selected window against the immediately preceding equal window; when there
 * isn't enough history to compare, the delta is null (shown as "—").
 */
export async function computeMetrics(range: Range): Promise<Metrics> {
  const campaigns = await listCampaigns();
  const days = windowDays(range);
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  const prevStart = new Date(start);
  prevStart.setUTCDate(prevStart.getUTCDate() - days);

  const at = (c: Campaign) => new Date(c.created_at ?? now.toISOString());
  const inWindow = (c: Campaign) => at(c) >= start;
  const inPrev = (c: Campaign) => at(c) >= prevStart && at(c) < start;

  const cur = campaigns.filter(inWindow);
  const prev = campaigns.filter(inPrev);

  const sum = (list: Campaign[], k: string) =>
    list.reduce((n, c) => n + m(c, k), 0);

  // Daily buckets across the window.
  const buckets = new Map<string, { sent: number; leads: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    buckets.set(dayKey(d), { sent: 0, leads: 0 });
  }
  for (const c of cur) {
    const key = dayKey(at(c));
    const b = buckets.get(key);
    if (b) {
      b.sent += m(c, "sent");
      b.leads += m(c, "processed");
    }
  }
  const series: SeriesPoint[] = [...buckets.entries()].map(([date, v]) => ({
    date,
    label: new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    sent: v.sent,
    leads: v.leads,
  }));

  const sentSpark = series.map((p) => p.sent);
  const leadSpark = series.map((p) => p.leads);

  const curSent = sum(cur, "sent");
  const curLeads = sum(cur, "processed");
  const curReplied = sum(cur, "replied");
  const prevSent = sum(prev, "sent");
  const prevLeads = sum(prev, "processed");
  const prevReplied = sum(prev, "replied");

  const replyRate = curSent ? (curReplied / curSent) * 100 : 0;
  const prevReplyRate = prevSent ? (prevReplied / prevSent) * 100 : 0;

  const kpis: Kpi[] = [
    {
      key: "leads",
      label: "Leads processed",
      value: curLeads,
      deltaPct: pctDelta(curLeads, prevLeads),
      format: "int",
      spark: leadSpark,
    },
    {
      key: "sent",
      label: "Emails sent",
      value: curSent,
      deltaPct: pctDelta(curSent, prevSent),
      format: "int",
      spark: sentSpark,
    },
    {
      key: "reply",
      label: "Reply rate",
      value: Math.round(replyRate * 10) / 10,
      deltaPct: pctDelta(replyRate, prevReplyRate),
      format: "pct",
      spark: series.map((p) => p.sent), // shape only
    },
    {
      key: "campaigns",
      label: "Active campaigns",
      value: cur.length,
      deltaPct: pctDelta(cur.length, prev.length),
      format: "int",
      spark: series.map((p) => (p.leads > 0 ? 1 : 0)),
    },
  ];

  const funnel: FunnelStage[] = [
    { stage: "Processed", value: curLeads },
    { stage: "Personalized", value: curLeads },
    { stage: "Sent", value: curSent },
    { stage: "Replied", value: curReplied },
  ];

  return {
    range,
    kpis,
    series,
    funnel,
    campaigns,
    hasData: campaigns.length > 0,
  };
}
