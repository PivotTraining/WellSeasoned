import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CampaignDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-3xl font-bold">Campaign</h1>
      <p className="mb-8 font-mono text-sm text-zinc-500">{id}</p>

      <Card>
        <h2 className="mb-2 text-lg font-semibold">Agent trace</h2>
        <p className="text-sm text-zinc-400">
          Per-lead pipeline traces (research → personalize → outreach) and A/B
          results render here. Wire this to the <code>agent_logs</code> and{" "}
          <code>leads</code> tables to populate it.
        </p>
      </Card>
    </div>
  );
}
