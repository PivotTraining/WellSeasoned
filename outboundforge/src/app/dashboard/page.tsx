import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { AreaTrend } from "@/components/charts/AreaTrend";
import { Funnel } from "@/components/charts/Funnel";
import { RangeTabs } from "@/components/dashboard/RangeTabs";
import { SampleDataButton } from "@/components/dashboard/SampleDataButton";
import { computeMetrics, type Range } from "@/lib/metrics";
import { usingDb } from "@/lib/store";
import { configured } from "@/lib/env";

export const dynamic = "force-dynamic";

const RANGES: Range[] = ["7d", "30d", "all"];

const CHECKS: { key: keyof typeof configured; label: string }[] = [
  { key: "supabase", label: "Supabase" },
  { key: "llm", label: "LLM" },
  { key: "outreach", label: "Resend" },
  { key: "research", label: "Research" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: Range = RANGES.includes(sp.range as Range)
    ? (sp.range as Range)
    : "30d";
  const metrics = await computeMetrics(range);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Home</h1>
          <p className="text-sm text-muted">
            Your outbound at a glance — pipeline, sends, and replies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RangeTabs current={range} />
          <Link href="/dashboard/campaigns/new">
            <Button>New campaign</Button>
          </Link>
        </div>
      </div>

      {/* Demo notice */}
      {!usingDb() && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3">
          <p className="text-sm text-body">
            <span className="font-medium text-ink">Demo mode.</span> Metrics
            come from an in-memory store that resets on restart. Connect
            Supabase to persist real data.
          </p>
          <SampleDataButton hasData={metrics.hasData} />
        </div>
      )}

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.kpis.map((kpi) => (
          <StatCard key={kpi.key} kpi={kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-ink">Outreach activity</h2>
              <p className="text-xs text-muted">
                Emails sent and leads processed per day
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-body">
                <span className="h-2 w-2 rounded-full bg-brand" /> Sent
              </span>
              <span className="flex items-center gap-1.5 text-body">
                <span className="h-2 w-2 rounded-full bg-good" /> Leads
              </span>
            </div>
          </div>
          <AreaTrend data={metrics.series} />
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold text-ink">Pipeline funnel</h2>
          <p className="mb-4 text-xs text-muted">Conversion from lead to reply</p>
          <Funnel stages={metrics.funnel} />
        </Card>
      </div>

      {/* Campaigns table + integrations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="font-semibold text-ink">Recent campaigns</h2>
            <Link
              href="/dashboard/campaigns"
              className="text-sm text-brand hover:underline"
            >
              View all
            </Link>
          </div>
          {metrics.campaigns.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted">
              No campaigns yet.{" "}
              <Link
                href="/dashboard/campaigns/new"
                className="text-brand hover:underline"
              >
                Launch your first
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-forge-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-6 py-2.5 font-medium">Campaign</th>
                    <th className="px-3 py-2.5 text-right font-medium">Leads</th>
                    <th className="px-3 py-2.5 text-right font-medium">Sent</th>
                    <th className="px-3 py-2.5 text-right font-medium">Reply</th>
                    <th className="px-6 py-2.5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.campaigns.slice(0, 6).map((c) => {
                    const sent = c.metrics.sent ?? 0;
                    const replied = c.metrics.replied ?? 0;
                    const reply = sent ? Math.round((replied / sent) * 1000) / 10 : 0;
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-forge-line last:border-0 hover:bg-forge-bg"
                      >
                        <td className="px-6 py-3">
                          <Link
                            href={`/dashboard/campaigns/${c.id}`}
                            className="font-medium text-ink hover:text-brand"
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td className="tnum px-3 py-3 text-right text-body">
                          {(c.metrics.processed ?? 0).toLocaleString()}
                        </td>
                        <td className="tnum px-3 py-3 text-right text-body">
                          {sent.toLocaleString()}
                        </td>
                        <td className="tnum px-3 py-3 text-right text-body">
                          {reply}%
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Badge tone={c.status === "done" ? "green" : "amber"}>
                            {c.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold text-ink">Integrations</h2>
          <p className="mb-4 text-xs text-muted">
            Config-gated — the app runs without keys.
          </p>
          <ul className="space-y-2">
            {CHECKS.map(({ key, label }) => {
              const on = configured[key];
              return (
                <li
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-forge-line px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-body">
                    <span
                      className={`h-2 w-2 rounded-full ${on ? "bg-good" : "bg-muted/40"}`}
                    />
                    {label}
                  </span>
                  <span className="text-xs text-muted">
                    {on ? "connected" : "not set"}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
