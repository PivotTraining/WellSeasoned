import { llmComplete } from "@/lib/llm";

export interface ReplyInsights {
  objections: string[];
  suggestions: string[];
  summary: string;
}

/**
 * Analyze a batch of inbound replies for common objections and suggested
 * copy changes. Run after each campaign batch. Returns an empty, honest
 * result when there are no replies rather than inventing insights.
 */
export async function analyzeReplies(
  replies: string[],
): Promise<ReplyInsights> {
  const cleaned = replies.map((r) => r.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return { objections: [], suggestions: [], summary: "No replies to analyze yet." };
  }

  const out = await llmComplete(
    `Extract common objections and concrete copy suggestions from these ` +
      `cold-outreach replies. Return JSON: ` +
      `{"objections":[],"suggestions":[],"summary":""}.\n\n` +
      cleaned.join("\n---\n"),
  );

  try {
    const j = JSON.parse(out) as Partial<ReplyInsights>;
    return {
      objections: j.objections ?? [],
      suggestions: j.suggestions ?? [],
      summary: j.summary ?? "",
    };
  } catch {
    // Unconfigured / non-JSON — surface the raw text as the summary.
    return { objections: [], suggestions: [], summary: out };
  }
}
