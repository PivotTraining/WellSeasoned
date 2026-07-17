import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { configured } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase";
import { runCampaign } from "@/lib/runCampaign";
import { ICPSchema } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { name?: string; icp?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const icpText = (body.icp ?? "").trim();
  if (!name || !icpText) {
    return NextResponse.json(
      { error: "name and icp are required" },
      { status: 400 },
    );
  }

  const icp = ICPSchema.parse({ description: icpText });
  const id = randomUUID();
  const campaign = {
    id,
    name,
    icp,
    status: "draft" as const,
    metrics: {},
  };

  // Persist when configured; otherwise return an in-memory campaign so the
  // scaffold is fully exercisable without a database.
  const db = supabaseAdmin();
  if (db && configured.supabaseAdmin) {
    await db.from("campaigns").insert(campaign);
  }

  const summary = await runCampaign(id);

  return NextResponse.json({
    campaign: { id, name, status: "running" },
    summary: {
      processed: summary.processed,
      succeeded: summary.succeeded,
      skipped: summary.skipped,
    },
    note: db
      ? undefined
      : "Supabase not configured — campaign was not persisted and no leads were processed.",
  });
}
