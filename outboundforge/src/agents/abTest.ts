import { llmComplete } from "@/lib/llm";
import type { Draft } from "@/lib/types";

/** Generate N subject/CTA variants of a base draft for A/B testing. */
export async function generateVariants(
  base: Draft,
  count = 3,
): Promise<Draft[]> {
  const out = await llmComplete(
    `Generate ${count} A/B variants of this cold email. Vary the subject ` +
      `and CTA, keep the offer. Return a JSON array of {subject, body}.\n` +
      `Base: ${JSON.stringify(base)}`,
  );
  try {
    const arr = JSON.parse(out) as Array<{ subject: string; body: string }>;
    return arr.slice(0, count).map((v) => ({
      subject: v.subject,
      body: v.body,
      channel: base.channel,
    }));
  } catch {
    // Unconfigured / unparseable — return the base as the single variant.
    return [base];
  }
}

export interface VariantResult {
  variant: string;
  sent: number;
  opened: number;
  replied: number;
}

/** Pick the winning variant by reply rate (ties broken by open rate). */
export function analyzeWinner(results: VariantResult[]): VariantResult | null {
  if (results.length === 0) return null;
  return [...results].sort((a, b) => {
    const ra = a.sent ? a.replied / a.sent : 0;
    const rb = b.sent ? b.replied / b.sent : 0;
    if (rb !== ra) return rb - ra;
    const oa = a.sent ? a.opened / a.sent : 0;
    const ob = b.sent ? b.opened / b.sent : 0;
    return ob - oa;
  })[0];
}
