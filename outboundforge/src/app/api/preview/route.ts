import { NextResponse } from "next/server";
import { researchLead } from "@/agents/tools/research";
import { scoreLead } from "@/agents/scoring";
import { writeDraft } from "@/agents/personalize";
import { checkCompliance } from "@/agents/compliance";
import { parseLeads, type Lead } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generate a single sample outreach email from an ICP (+ optional first lead)
 * so the campaign form can show a live preview with its research score and
 * compliance verdict — the same steps the real pipeline runs, minus the send.
 */
export async function POST(req: Request) {
  let body: { icp?: string; leads?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const icp = (body.icp ?? "").trim();
  if (!icp) {
    return NextResponse.json({ error: "icp is required" }, { status: 400 });
  }

  const parsed = parseLeads(body.leads ?? "");
  const lead: Lead = parsed[0] ?? {
    company: "Acme Robotics",
    contact: "Jordan",
    context: undefined,
  };

  const enriched = await researchLead(lead);
  const score = await scoreLead(enriched);
  const draft = await writeDraft(lead, enriched, icp);
  const compliance = await checkCompliance(`${draft.subject}\n\n${draft.body}`);

  return NextResponse.json({ lead, enriched, score, draft, compliance });
}
