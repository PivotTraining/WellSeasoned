"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface LaunchResponse {
  campaign?: { id: string; name: string; status: string };
  summary?: { processed: number; succeeded: number; skipped: number };
  error?: string;
}

export default function NewCampaign() {
  const [name, setName] = useState("");
  const [icp, setIcp] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<LaunchResponse | null>(null);

  async function launch() {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icp }),
      });
      setResult(await res.json());
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "request failed" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-8 text-3xl font-bold">Launch AI SDR Campaign</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Campaign name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q3 fintech founders"
              className="w-full rounded-lg border border-forge-line bg-forge-panel p-3 text-sm outline-none focus:border-forge-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Ideal Customer Profile
            </label>
            <Textarea
              value={icp}
              onChange={(e) => setIcp(e.target.value)}
              placeholder="Seed-stage B2B SaaS founders in fintech, US-based, 5-50 employees…"
              className="h-48"
            />
          </div>
          <Button
            size="lg"
            onClick={launch}
            disabled={pending || !name.trim() || !icp.trim()}
          >
            {pending ? "Deploying agent swarm…" : "Launch Campaign"}
          </Button>
        </div>

        <Card>
          <h3 className="mb-3 text-lg font-semibold">Result</h3>
          {!result && (
            <p className="text-sm text-zinc-500">
              Launch a campaign to create it and run the research →
              personalize → outreach pipeline over its leads.
            </p>
          )}
          {result?.error && (
            <p className="text-sm text-red-400">{result.error}</p>
          )}
          {result?.campaign && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-zinc-500">Campaign:</span>{" "}
                {result.campaign.name} ({result.campaign.status})
              </p>
              {result.summary && (
                <p className="text-zinc-400">
                  Processed {result.summary.processed} leads ·{" "}
                  {result.summary.succeeded} sent · {result.summary.skipped}{" "}
                  skipped
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
