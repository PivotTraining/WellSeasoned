"use client";

import type { FunnelStage } from "@/lib/metrics";

const COLORS = ["#635bff", "#7b74ff", "#1ea672", "#0a2540"];

export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  const top = stages[0]?.value ?? 0;
  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        const conv = top ? Math.round((s.value / top) * 100) : 0;
        return (
          <div key={s.stage}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-body">{s.stage}</span>
              <span className="text-ink">
                <span className="tnum font-semibold">
                  {s.value.toLocaleString()}
                </span>
                <span className="ml-2 text-xs text-muted">{conv}%</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-forge-bg">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(pct, s.value > 0 ? 3 : 0)}%`,
                  background: COLORS[i % COLORS.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
