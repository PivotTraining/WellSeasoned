"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "@/lib/metrics";

const AXIS = "#8792a2";

export function AreaTrend({ data }: { data: SeriesPoint[] }) {
  // Thin out x-axis ticks for long ranges.
  const step = Math.max(1, Math.ceil(data.length / 8));
  const ticks = data.filter((_, i) => i % step === 0).map((p) => p.label);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
      >
        <defs>
          <linearGradient id="sentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#635bff" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#635bff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#eef1f6" />
        <XAxis
          dataKey="label"
          ticks={ticks}
          tick={{ fill: AXIS, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "#e3e8ee" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: AXIS, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ stroke: "#c7cede", strokeWidth: 1 }}
          contentStyle={{
            borderRadius: 10,
            border: "1px solid #e3e8ee",
            boxShadow: "0 4px 12px rgba(10,37,64,0.10)",
            fontSize: 12,
          }}
          labelStyle={{ color: "#0a2540", fontWeight: 600 }}
        />
        <Area
          type="monotone"
          dataKey="sent"
          name="Emails sent"
          stroke="#635bff"
          strokeWidth={2}
          fill="url(#sentFill)"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="leads"
          name="Leads processed"
          stroke="#1ea672"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
