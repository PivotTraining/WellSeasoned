import { buildCampaignGraph } from "@/agents/campaignGraph";
import { supabaseAdmin } from "./supabase";
import type { Lead } from "./types";

/** Load a campaign's leads. Returns [] when Supabase isn't configured. */
async function getLeads(campaignId: string): Promise<Lead[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  const { data } = await db
    .from("leads")
    .select("data")
    .eq("campaign_id", campaignId);
  return (data ?? []).map((r) => r.data as Lead);
}

export interface RunSummary {
  campaignId: string;
  processed: number;
  succeeded: number;
  skipped: number;
}

/**
 * Run the multi-agent pipeline over every lead in a campaign. Each lead
 * gets its own graph thread. Safe to call unconfigured — it simply
 * processes zero leads and reports it.
 */
export async function runCampaign(campaignId: string): Promise<RunSummary> {
  const graph = buildCampaignGraph();
  const leads = await getLeads(campaignId);

  let succeeded = 0;
  let skipped = 0;

  for (const lead of leads) {
    const final = await graph.invoke({ campaignId, lead });
    if (final.outcome === "success") succeeded += 1;
    else skipped += 1;
  }

  return {
    campaignId,
    processed: leads.length,
    succeeded,
    skipped,
  };
}
