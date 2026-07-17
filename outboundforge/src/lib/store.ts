import { randomUUID } from "node:crypto";
import { configured } from "./env";
import { supabaseAdmin } from "./supabase";
import type { Campaign, CampaignStatus, Lead, LeadStatus } from "./types";

/**
 * Persistence layer. Uses Supabase when configured; otherwise an in-memory
 * store (shared across requests in a single server process) so the whole
 * create → run → inspect flow works offline. The in-memory data is ephemeral
 * and resets on restart — the UI labels it as a demo store.
 */

export interface LeadRow {
  id: string;
  campaign_id: string;
  data: Lead;
  status: LeadStatus;
}

export interface LogRow {
  id: number;
  campaign_id: string;
  step: string;
  input: unknown;
  output: unknown;
  timestamp: string;
}

interface Mem {
  campaigns: Campaign[];
  leads: LeadRow[];
  logs: LogRow[];
  seq: number;
}

const g = globalThis as unknown as { __ofStore?: Mem };
function mem(): Mem {
  if (!g.__ofStore) g.__ofStore = { campaigns: [], leads: [], logs: [], seq: 1 };
  return g.__ofStore;
}

export const usingDb = () => configured.supabaseAdmin;

export async function createCampaign(
  input: Pick<Campaign, "name" | "icp"> & { user_id?: string | null },
): Promise<Campaign> {
  const campaign: Campaign = {
    id: randomUUID(),
    user_id: input.user_id ?? null,
    name: input.name,
    icp: input.icp,
    status: "draft",
    metrics: {},
    created_at: new Date().toISOString(),
  };
  const db = supabaseAdmin();
  if (usingDb() && db) {
    await db.from("campaigns").insert(campaign);
  } else {
    mem().campaigns.unshift(campaign);
  }
  return campaign;
}

export async function addLeads(campaignId: string, leads: Lead[]): Promise<void> {
  if (leads.length === 0) return;
  const rows: LeadRow[] = leads.map((data) => ({
    id: randomUUID(),
    campaign_id: campaignId,
    data,
    status: "queued",
  }));
  const db = supabaseAdmin();
  if (usingDb() && db) {
    await db.from("leads").insert(rows);
  } else {
    mem().leads.push(...rows);
  }
}

export async function getLeads(campaignId: string): Promise<Lead[]> {
  const db = supabaseAdmin();
  if (usingDb() && db) {
    const { data } = await db
      .from("leads")
      .select("data")
      .eq("campaign_id", campaignId);
    return (data ?? []).map((r) => r.data as Lead);
  }
  return mem()
    .leads.filter((l) => l.campaign_id === campaignId)
    .map((l) => l.data);
}

export async function listCampaigns(): Promise<Campaign[]> {
  const db = supabaseAdmin();
  if (usingDb() && db) {
    const { data } = await db
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    return (data ?? []) as Campaign[];
  }
  return mem().campaigns;
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const db = supabaseAdmin();
  if (usingDb() && db) {
    const { data } = await db.from("campaigns").select("*").eq("id", id).single();
    return (data as Campaign) ?? null;
  }
  return mem().campaigns.find((c) => c.id === id) ?? null;
}

export async function setCampaign(
  id: string,
  patch: { status?: CampaignStatus; metrics?: Record<string, number> },
): Promise<void> {
  const db = supabaseAdmin();
  if (usingDb() && db) {
    await db.from("campaigns").update(patch).eq("id", id);
    return;
  }
  const c = mem().campaigns.find((x) => x.id === id);
  if (c) Object.assign(c, patch);
}

export async function logStep(
  campaignId: string,
  step: string,
  input: unknown,
  output: unknown,
): Promise<void> {
  const timestamp = new Date().toISOString();
  const db = supabaseAdmin();
  if (usingDb() && db) {
    await db
      .from("agent_logs")
      .insert({ campaign_id: campaignId, step, input, output, timestamp });
    return;
  }
  const m = mem();
  m.logs.push({ id: m.seq++, campaign_id: campaignId, step, input, output, timestamp });
}

export async function listLogs(campaignId: string): Promise<LogRow[]> {
  const db = supabaseAdmin();
  if (usingDb() && db) {
    const { data } = await db
      .from("agent_logs")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("timestamp", { ascending: true });
    return (data ?? []) as LogRow[];
  }
  return mem().logs.filter((l) => l.campaign_id === campaignId);
}

// --- Demo-only sample data (in-memory store only) ---------------------------

const SAMPLE = [
  { name: "Fintech Founders — Q3", icp: "Seed-stage fintech founders, US, post-raise", daysAgo: 12, processed: 96 },
  { name: "Series A Ops Leaders", icp: "Series A ops/RevOps leaders at 50-200p SaaS", daysAgo: 10, processed: 64 },
  { name: "DevTools ICs → Champions", icp: "Senior engineers at dev-tools companies", daysAgo: 8, processed: 128 },
  { name: "Healthcare CTOs", icp: "CTOs at digital-health startups, HIPAA-aware", daysAgo: 6, processed: 52 },
  { name: "Ecomm Growth Leads", icp: "Head of Growth at DTC brands >$5M GMV", daysAgo: 4, processed: 110 },
  { name: "Agency Founders", icp: "Founders of 10-40p marketing agencies", daysAgo: 3, processed: 78 },
  { name: "Fractional CFOs", icp: "Fractional CFOs serving seed/Series A startups", daysAgo: 1, processed: 44 },
];

/** Seed labeled sample campaigns so the dashboard has data. Demo store only. */
export async function seedSampleData(): Promise<number> {
  const store = mem();
  for (const s of SAMPLE) {
    const created = new Date();
    created.setUTCDate(created.getUTCDate() - s.daysAgo);
    const sent = Math.round(s.processed * 0.66);
    const skipped = s.processed - sent;
    const replied = Math.round(sent * 0.07);
    store.campaigns.unshift({
      id: randomUUID(),
      user_id: null,
      name: s.name,
      icp: { description: s.icp },
      status: "done",
      metrics: { processed: s.processed, sent, skipped, replied },
      created_at: created.toISOString(),
    });
  }
  return SAMPLE.length;
}

export async function clearSampleData(): Promise<void> {
  const store = mem();
  store.campaigns = [];
  store.leads = [];
  store.logs = [];
  store.seq = 1;
}
