import { Sparkline } from "@/components/charts/Sparkline";
import type { Kpi } from "@/lib/metrics";

function fmt(kpi: Kpi): string {
  if (kpi.format === "pct") return `${kpi.value}%`;
  return kpi.value.toLocaleString();
}

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-xs text-muted">— no prior data</span>;
  }
  const up = pct >= 0;
  const rounded = Math.abs(Math.round(pct * 10) / 10);
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? "text-good" : "text-bad"
      }`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {rounded}%
      <span className="ml-1 font-normal text-muted">vs prev</span>
    </span>
  );
}

export function StatCard({ kpi }: { kpi: Kpi }) {
  const color = kpi.key === "sent" ? "#635bff" : kpi.key === "reply" ? "#1ea672" : "#635bff";
  return (
    <div className="rounded-xl border border-forge-line bg-white p-5 shadow-card">
      <div className="text-sm text-muted">{kpi.label}</div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="tnum text-3xl font-semibold text-ink">{fmt(kpi)}</div>
        <div className="h-9 w-24">
          <Sparkline data={kpi.spark} color={color} />
        </div>
      </div>
      <div className="mt-2">
        <Delta pct={kpi.deltaPct} />
      </div>
    </div>
  );
}
