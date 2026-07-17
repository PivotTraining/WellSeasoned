import { llmComplete } from "@/lib/llm";
import type { Enrichment } from "@/lib/types";

/**
 * Score a lead 0-100 for sales potential. Falls back to a heuristic
 * (signal count) when the LLM is unconfigured, so scoring always returns
 * a usable number.
 */
export async function scoreLead(
  enrichment: Enrichment,
  historicalWins: string[] = [],
): Promise<number> {
  const heuristic = Math.min(100, 40 + enrichment.signals.length * 15);

  const out = await llmComplete(
    `Score this lead 0-100 for sales potential. Reply with ONLY the number.\n` +
      `Historical winning patterns: ${JSON.stringify(historicalWins)}\n` +
      `Lead: ${JSON.stringify(enrichment)}`,
  );

  const parsed = parseInt(out.replace(/[^0-9]/g, "").slice(0, 3), 10);
  if (Number.isNaN(parsed)) return heuristic;
  return Math.max(0, Math.min(100, parsed));
}
