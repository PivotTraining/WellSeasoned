"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink">
        Launch AI SDR campaign
      </h1>
      <p className="mb-6 text-sm text-muted">
        Describe your ideal customer, drop in leads, and the agent pipeline
        runs research → personalize → compliance → outreach.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Campaign name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q3 fintech founders"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Ideal customer profile
            </label>
            <Textarea
              value={icp}
              onChange={(e) => setIcp(e.target.value)}
              placeholder="Seed-stage B2B SaaS founders in fintech, US-based, 5-50 employees…"
              className="h-32"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Leads{" "}
              <span className="font-normal text-muted">
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
              {previewing ? "Generating…" : "Live preview"}
            </Button>
            <Button onClick={launch} disabled={!canLaunch} className="flex-1">
              {launching ? "Deploying agents…" : "Launch campaign"}
            </Button>
          </div>
          {error && <p className="text-sm text-bad">{error}</p>}
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-ink">Live preview</h3>
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
            <p className="text-sm text-muted">
              Add an ICP and hit <strong className="text-body">Live
              preview</strong> to see a sample personalized email, its lead
              score, and the compliance verdict — the same steps the pipeline
              runs, without sending.
            </p>
          )}

          {preview && (
            <div className="space-y-4 text-sm">
              <div>
                <div className="mb-1 text-xs uppercase tracking-wide text-muted">
                  Subject
                </div>
                <div className="font-medium text-ink">
                  {preview.draft.subject}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs uppercase tracking-wide text-muted">
                  Body
                </div>
                <pre className="whitespace-pre-wrap break-words rounded-lg border border-forge-line bg-forge-bg p-3 text-body">
                  {preview.draft.body}
                </pre>
              </div>
              <div className="text-xs text-muted">
                Research source: {preview.enriched.source} · Spam risk:{" "}
                {preview.compliance.score < 0
                  ? "n/a"
                  : `${preview.compliance.score}/10`}
              </div>
              {preview.compliance.reasons.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-warn">
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
