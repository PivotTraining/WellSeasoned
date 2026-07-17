"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Variant {
  subject: string;
  body: string;
}

export function ABLab() {
  const [subject, setSubject] = useState("Quick idea for {{company}}");
  const [body, setBody] = useState(
    "Hi {{contact}} — noticed you're scaling outbound. We help teams like yours book more meetings without more reps. Worth a quick look?",
  );
  const [variants, setVariants] = useState<Variant[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/abtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, count: 3 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "failed");
      setVariants(json.variants ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-muted">
          Base subject
        </label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-lg border border-forge-line bg-white p-2.5 text-sm text-ink outline-none focus:border-brand"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-muted">
          Base body
        </label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="h-24"
        />
      </div>
      <Button onClick={run} disabled={pending || !body.trim()}>
        {pending ? "Generating variants…" : "Generate A/B variants"}
      </Button>
      {error && <p className="text-sm text-bad">{error}</p>}

      {variants.length > 0 && (
        <div className="space-y-3">
          {variants.map((v, i) => (
            <div
              key={i}
              className="rounded-md border border-forge-line bg-forge-bg p-3"
            >
              <div className="mb-1 text-xs text-muted">Variant {i + 1}</div>
              <div className="mb-1 text-sm font-medium">{v.subject}</div>
              <p className="whitespace-pre-wrap text-sm text-body">
                {v.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
