import * as React from "react";

type Tone = "neutral" | "green" | "amber" | "red" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-forge-bg text-body border-forge-line",
  green: "bg-good/10 text-good border-good/20",
  amber: "bg-warn/10 text-warn border-warn/20",
  red: "bg-bad/10 text-bad border-bad/20",
  accent: "bg-brand-soft text-brand border-brand/20",
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
