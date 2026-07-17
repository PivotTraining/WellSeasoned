"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Preview {
  score: number;
  draft: { subject: string; body: string };
  compliance: { score: number; safe: boolean; reasons: string[] };
  enriched: { source: string; summary: string };
}

export default function NewCampaign() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [icp, setIcp] = useState("");
  const [leads, setLeads] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runPreview() {
    setPreviewing(true);
    setError(null);
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icp, leads }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "preview failed");
      setPreview(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  async function launch() {
    setLaunching(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icp, leads }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "launch failed");
      router.push(`/dashboard/campaigns/${json.campaign.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "launch failed");
      setLaunching(false);
    }
  }

  const canPreview = icp.trim().length > 0 && !previewing;
  const canLaunch = name.trim() && icp.trim() && !launching;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-3xl font-bold">Launch AI SDR Campaign</h1>
      <p className="mb-8 text-sm text-zinc-400">
        Describe your ideal customer, drop in leads, and the agent pipeline
        will research → personalize → run compliance → queue outreach.
      </p>

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
              className="h-32"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Leads{" "}
              <span className="text-zinc-600">
                — one per line: Company, Contact, email
              </span>
            </label>
            <Textarea
              value={leads}
              onChange={(e) => setLeads(e.target.value)}
              placeholder={
                "Acme Robotics, Jordan Lee, jordan@acme.com\nNorthwind, Priya Patel, priya@northwind.io"
              }
              className="h-28 font-mono text-xs"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={runPreview}
              disabled={!canPreview}
              className="flex-1"
            >
              {previewing ? "Generating…" : "Live Preview"}
            </Button>
            <Button
              size="md"
              onClick={launch}
              disabled={!canLaunch}
              className="flex-1"
            >
              {launching ? "Deploying agents…" : "Launch Campaign"}
            </Button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Live preview</h3>
            {preview && (
              <div className="flex items-center gap-2">
                <Badge tone="accent">Lead score {preview.score}</Badge>
                <Badge tone={preview.compliance.safe ? "green" : "red"}>
                  {preview.compliance.safe ? "Compliant" : "Blocked"}
                </Badge>
              </div>
            )}
          </div>

          {!preview && (
            <p className="text-sm text-zinc-500">
              Add an ICP and hit <strong>Live Preview</strong> to see a sample
              personalized email, its lead score, and the compliance verdict —
              the same steps the pipeline runs, without sending.
            </p>
          )}

          {preview && (
            <div className="space-y-4 text-sm">
              <div>
                <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">
                  Subject
                </div>
                <div className="font-medium">{preview.draft.subject}</div>
              </div>
              <div>
                <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">
                  Body
                </div>
                <pre className="whitespace-pre-wrap break-words rounded-md border border-forge-line bg-forge-bg p-3 text-zinc-300">
                  {preview.draft.body}
                </pre>
              </div>
              <div className="text-xs text-zinc-500">
                Research source: {preview.enriched.source} · Spam risk:{" "}
                {preview.compliance.score < 0
                  ? "n/a"
                  : `${preview.compliance.score}/10`}
              </div>
              {preview.compliance.reasons.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-amber-300/80">
                  {preview.compliance.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
