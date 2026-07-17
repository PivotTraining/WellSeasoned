import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listCampaigns } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await listCampaigns();
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <Link href="/dashboard/campaigns/new">
          <Button size="lg">New Campaign</Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500">
            No campaigns yet.{" "}
            <Link
              href="/dashboard/campaigns/new"
              className="text-forge-accent hover:underline"
            >
              Launch your first
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/dashboard/campaigns/${c.id}`}>
              <Card className="h-full transition-colors hover:border-forge-accent/50">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">{c.name}</h3>
                  <Badge tone={c.status === "done" ? "green" : "amber"}>
                    {c.status}
                  </Badge>
                </div>
                <p className="mb-3 line-clamp-2 text-sm text-zinc-400">
                  {c.icp.description}
                </p>
                <div className="flex gap-4 text-xs text-zinc-500">
                  <span>{c.metrics.processed ?? 0} leads</span>
                  <span>{c.metrics.sent ?? 0} sent</span>
                  <span>{c.metrics.skipped ?? 0} skipped</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
