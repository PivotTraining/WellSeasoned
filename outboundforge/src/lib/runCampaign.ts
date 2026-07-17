import { buildCampaignGraph } from "@/agents/campaignGraph";
import { getLeads, setCampaign } from "./store";

export interface RunSummary {
  campaignId: string;
  processed: number;
  succeeded: number;
  skipped: number;
}

/**
 * Run the multi-agent pipeline over every lead in a campaign. Each lead gets
 * its own graph thread. Safe to call unconfigured — it simply processes the
 * campaign's leads through the stub path and records the trace.
 */
export async function runCampaign(campaignId: string): Promise<RunSummary> {
  const graph = buildCampaignGraph();
  const leads = await getLeads(campaignId);
  await setCampaign(campaignId, { status: "running" });

  let succeeded = 0;
  let skipped = 0;

  for (const lead of leads) {
    const final = await graph.invoke({ campaignId, lead });
    if (final.outcome === "success") succeeded += 1;
    else skipped += 1;
  }

  const summary: RunSummary = {
    campaignId,
    processed: leads.length,
    succeeded,
    skipped,
  };

  await setCampaign(campaignId, {
    status: "done",
    metrics: {
      processed: summary.processed,
      sent: summary.succeeded,
      skipped: summary.skipped,
    },
  });

  return summary;
}
