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
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard/campaigns"
        className="text-sm text-zinc-400 hover:text-white"
      >
        ← Campaigns
      </Link>

      <div className="mb-6 mt-2 flex items-center gap-3">
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
        <Badge tone={campaign.status === "done" ? "green" : "amber"}>
          {campaign.status}
        </Badge>
      </div>
      <p className="mb-8 text-sm text-zinc-400">{campaign.icp.description}</p>

      <div className="mb-8 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="py-5">
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-sm text-zinc-400">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Agent trace</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No steps logged. Add leads on launch to populate the pipeline
            trace (research → personalize → outreach).
          </p>
        ) : (
          <ol className="space-y-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-start gap-3 rounded-md border border-forge-line bg-forge-bg p-3 text-sm"
              >
                <Badge tone={STEP_TONE[log.step] ?? "neutral"}>
                  {log.step}
                </Badge>
                <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words text-xs text-zinc-400">
                  {JSON.stringify(log.output, null, 0).slice(0, 400)}
                </pre>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">A/B lab</h2>
        <ABLab />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Reply insights</h2>
        <ReplyInsights />
      </Card>
    </div>
  );
}
