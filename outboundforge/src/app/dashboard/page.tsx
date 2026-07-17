import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { configured } from "@/lib/env";

export const dynamic = "force-dynamic";

const CHECKS: { key: keyof typeof configured; label: string }[] = [
  { key: "supabase", label: "Supabase (data)" },
  { key: "llm", label: "LLM (personalization)" },
  { key: "outreach", label: "Resend (delivery)" },
  { key: "research", label: "Research providers" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Overview</h1>
        <Link href="/dashboard/campaigns/new">
          <Button size="lg">New Campaign</Button>
        </Link>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Integration status</h2>
        <p className="mb-4 text-sm text-zinc-400">
          Every integration is config-gated. The app runs without keys — each
          missing integration simply degrades to a safe no-op.
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
    </div>
  );
}
