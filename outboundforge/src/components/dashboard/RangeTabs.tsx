"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS: { value: string; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

export function RangeTabs({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function select(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("range", value);
    router.push(`/dashboard?${next.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg border border-forge-line bg-white p-0.5 shadow-card">
      {OPTIONS.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            onClick={() => select(o.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-soft text-brand"
                : "text-body hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
