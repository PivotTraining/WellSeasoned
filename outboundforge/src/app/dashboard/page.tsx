import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { configured } from "@/lib/env";
import { listCampaigns, usingDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const CHECKS: { key: keyof typeof configured; label: string }[] = [
  { key: "supabase", label: "Supabase (data)" },
  { key: "llm", label: "LLM (personalization)" },
  { key: "outreach", label: "Resend (delivery)" },
  { key: "research", label: "Research providers" },
];

export default async function DashboardPage() {
  const campaigns = await listCampaigns();
  const totalProcessed = campaigns.reduce(
    (n, c) => n + (c.metrics.processed ?? 0),
    0,
  );
  const totalSent = campaigns.reduce((n, c) => n + (c.metrics.sent ?? 0), 0);

  const stats = [
    { label: "Campaigns", value: campaigns.length },
    { label: "Leads processed", value: totalProcessed },
    { label: "Sent", value: totalSent },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Overview</h1>
        <Link href="/dashboard/campaigns/new">
          <Button size="lg">New Campaign</Button>
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="py-5">
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-sm text-zinc-400">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold">Integration status</h2>
        <p className="mb-4 text-sm text-zinc-400">
          Every integration is config-gated. The app runs without keys — each
          missing integration degrades to a safe no-op.
          {!usingDb() && (
            <>
              {" "}
              Data is using the <strong>in-memory demo store</strong> (resets
              on restart) until Supabase is connected.
            </>
          )}
        </p>
        <ul className="grid grid-cols-2 gap-3">
          {CHECKS.map(({ key, label }) => {
            const on = configured[key];
            return (
              <li
                key={key}
                className="flex items-center gap-2 rounded-md border border-forge-line bg-forge-bg px-3 py-2 text-sm"
              >
                <span
                  className={`h-2 w-2 rounded-full ${on ? "bg-emerald-400" : "bg-zinc-600"}`}
                  aria-hidden
                />
                <span>{label}</span>
                <span className="ml-auto text-xs text-zinc-500">
                  {on ? "connected" : "not configured"}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent campaigns</h2>
          <Link
            href="/dashboard/campaigns"
            className="text-sm text-forge-accent hover:underline"
          >
            View all →
          </Link>
        </div>
        {campaigns.length === 0 ? (
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
        ) : (
          <ul className="divide-y divide-forge-line">
            {campaigns.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="flex items-center justify-between py-3 hover:opacity-80"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="flex items-center gap-3 text-sm text-zinc-400">
                    <span>{c.metrics.processed ?? 0} leads</span>
                    <Badge tone={c.status === "done" ? "green" : "amber"}>
                      {c.status}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
