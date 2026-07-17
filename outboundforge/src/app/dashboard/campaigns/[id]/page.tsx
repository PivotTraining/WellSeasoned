import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ABLab } from "@/components/ABLab";
import { ReplyInsights } from "@/components/ReplyInsights";
import { getCampaign, listLogs } from "@/lib/store";

export const dynamic = "force-dynamic";

const STEP_TONE: Record<string, "neutral" | "green" | "amber" | "accent"> = {
  research: "accent",
  personalize: "amber",
  outreach: "green",
};

export default async function CampaignDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const logs = await listLogs(id);
  const m = campaign.metrics;
  const stats = [
    { label: "Processed", value: m.processed ?? 0 },
    { label: "Sent", value: m.sent ?? 0 },
    { label: "Skipped", value: m.skipped ?? 0 },
  ];

  return (
    <div>
      <Link
        href="/dashboard/campaigns"
        className="text-sm text-muted hover:text-ink"
      >
        ← Campaigns
      </Link>

      <div className="mb-1 mt-3 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-ink">{campaign.name}</h1>
        <Badge tone={campaign.status === "done" ? "green" : "amber"}>
          {campaign.status}
        </Badge>
      </div>
      <p className="mb-6 text-sm text-body">{campaign.icp.description}</p>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className="tnum text-3xl font-semibold text-ink">
              {s.value.toLocaleString()}
            </div>
            <div className="mt-1 text-sm text-muted">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold text-ink">Agent trace</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted">
            No steps logged. Launch a campaign with leads to populate the
            pipeline trace (research → personalize → outreach).
          </p>
        ) : (
          <ol className="space-y-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-start gap-3 rounded-lg border border-forge-line bg-forge-bg p-3 text-sm"
              >
                <Badge tone={STEP_TONE[log.step] ?? "neutral"}>
                  {log.step}
                </Badge>
                <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words text-xs text-body">
                  {JSON.stringify(log.output, null, 0).slice(0, 400)}
                </pre>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 font-semibold text-ink">A/B lab</h2>
          <p className="mb-4 text-xs text-muted">
            Generate subject/CTA variants to test.
          </p>
          <ABLab />
        </Card>
        <Card>
          <h2 className="mb-1 font-semibold text-ink">Reply insights</h2>
          <p className="mb-4 text-xs text-muted">
            Extract objections and copy suggestions from replies.
          </p>
          <ReplyInsights />
        </Card>
      </div>
    </div>
  );
}
