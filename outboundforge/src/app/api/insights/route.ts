import { NextResponse } from "next/server";
import { analyzeReplies } from "@/agents/replies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Analyze a batch of pasted replies for objections + copy suggestions. */
export async function POST(req: Request) {
  let body: { replies?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const replies = (body.replies ?? "")
    .split(/\n-{2,}\n|\n{2,}/)
    .map((r) => r.trim())
    .filter(Boolean);

  const insights = await analyzeReplies(replies);
  return NextResponse.json({ insights, count: replies.length });
}
