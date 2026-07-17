import * as React from "react";

type Tone = "neutral" | "green" | "amber" | "red" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-forge-bg text-zinc-300 border-forge-line",
  green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  red: "bg-red-500/10 text-red-300 border-red-500/30",
  accent: "bg-forge-accent/10 text-forge-accent border-forge-accent/30",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
