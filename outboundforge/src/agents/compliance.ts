import { configured } from "@/lib/env";
import { llmComplete } from "@/lib/llm";

export interface ComplianceResult {
  /** Spam risk 0-10 (0 = clean). -1 when scoring was skipped. */
  score: number;
  safe: boolean;
  hasUnsubscribe: boolean;
  reasons: string[];
}

/**
 * Pre-send compliance gate. Checks CAN-SPAM basics (opt-out present) and an
 * LLM spam-risk score. Runs before EVERY send in the outreach node. When the
 * LLM is unconfigured, scoring is skipped (score = -1) and the gate falls back
 * to the deterministic unsubscribe check so it never fabricates a risk number.
 */
export async function checkCompliance(
  message: string,
): Promise<ComplianceResult> {
  const hasUnsubscribe = /unsubscribe|opt[\s-]?out/i.test(message);
  const reasons: string[] = [];

  let score = -1;
  if (configured.llm) {
    const out = await llmComplete(
      `Rate the spam risk of this cold email from 0 (clean) to 10 (spam). ` +
        `Reply with ONLY the number.\n\n${message}`,
    );
    const parsed = parseInt(out.replace(/[^0-9]/g, "").slice(0, 2), 10);
    score = Number.isNaN(parsed) ? -1 : Math.max(0, Math.min(10, parsed));
  }

  if (!hasUnsubscribe) {
    reasons.push("Missing unsubscribe/opt-out line (CAN-SPAM).");
  }
  if (score >= 4) {
    reasons.push(`Spam risk ${score}/10 is at or above the send threshold.`);
  }
  if (score === -1) {
    reasons.push("LLM not configured — spam scoring skipped.");
  }

  const safe = hasUnsubscribe && (score === -1 || score < 4);
  return { score, safe, hasUnsubscribe, reasons };
}
