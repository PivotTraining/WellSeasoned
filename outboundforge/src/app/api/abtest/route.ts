import { NextResponse } from "next/server";
import { generateVariants } from "@/agents/abTest";
import type { Draft } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Generate N subject/CTA variants of a base draft for A/B testing. */
export async function POST(req: Request) {
  let body: { subject?: string; body?: string; count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const base: Draft = {
    subject: (body.subject ?? "Quick idea").trim(),
    body: (body.body ?? "").trim(),
    channel: "email",
  };
  if (!base.body) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const count = Math.min(5, Math.max(1, body.count ?? 3));
  const variants = await generateVariants(base, count);
  return NextResponse.json({ variants });
}
