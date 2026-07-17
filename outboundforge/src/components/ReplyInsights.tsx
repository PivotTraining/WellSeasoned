"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Insights {
  objections: string[];
  suggestions: string[];
  summary: string;
}

export function ReplyInsights() {
  const [replies, setReplies] = useState("");
  const [insights, setInsights] = useState<Insights | null>(null);
  const [count, setCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replies }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "failed");
      setInsights(json.insights);
      setCount(json.count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Paste inbound replies (separate with a blank line). The analyst agent
        extracts common objections and copy suggestions to feed the next batch.
      </p>
      <Textarea
        value={replies}
        onChange={(e) => setReplies(e.target.value)}
        placeholder={
          "Not a priority right now, maybe next quarter.\n\nWe already use a competitor.\n\nCan you send pricing?"
        }
        className="h-28 bg-forge-bg"
      />
      <Button onClick={run} disabled={pending || !replies.trim()}>
        {pending ? "Analyzing…" : "Analyze replies"}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {insights && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Badge tone="accent">{count} replies</Badge>
            <span>{insights.summary}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-forge-line bg-forge-bg p-3">
              <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                Objections
              </div>
              {insights.objections.length ? (
                <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-300">
                  {insights.objections.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">—</p>
              )}
            </div>
            <div className="rounded-md border border-forge-line bg-forge-bg p-3">
              <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                Suggestions
              </div>
              {insights.suggestions.length ? (
                <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-300">
                  {insights.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">—</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
