import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listCampaigns } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await listCampaigns();
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Campaigns</h1>
          <p className="text-sm text-muted">
            {campaigns.length} total · click a campaign to see its agent trace.
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>New campaign</Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No campaigns yet.{" "}
            <Link
              href="/dashboard/campaigns/new"
              className="text-brand hover:underline"
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
              <Card className="h-full transition-shadow hover:shadow-pop">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-ink">{c.name}</h3>
                  <Badge tone={c.status === "done" ? "green" : "amber"}>
                    {c.status}
                  </Badge>
                </div>
                <p className="mb-4 line-clamp-2 text-sm text-body">
                  {c.icp.description}
                </p>
                <div className="flex gap-5 text-sm">
                  <span className="text-body">
                    <span className="tnum font-semibold text-ink">
                      {(c.metrics.processed ?? 0).toLocaleString()}
                    </span>{" "}
                    leads
                  </span>
                  <span className="text-body">
                    <span className="tnum font-semibold text-ink">
                      {(c.metrics.sent ?? 0).toLocaleString()}
                    </span>{" "}
                    sent
                  </span>
                  <span className="text-body">
                    <span className="tnum font-semibold text-ink">
                      {(c.metrics.skipped ?? 0).toLocaleString()}
                    </span>{" "}
                    skipped
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
