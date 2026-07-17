import { configured, env } from "@/lib/env";
import type { Enrichment, Lead } from "@/lib/types";

/**
 * Lead research/enrichment. When no provider key is set, returns a
 * deterministic stub so the graph runs end-to-end offline. Real Serper /
 * Apollo / Playwright calls slot in behind the `configured.research` gate.
 */
export async function researchLead(lead: Lead): Promise<Enrichment> {
  if (!configured.research) {
    return {
      company: lead.company,
      contact: lead.contact,
      summary: `Stub enrichment for ${lead.company}. Set SERPER_API_KEY or APOLLO_API_KEY to enable live research.`,
      signals: [],
      source: "stub",
    };
  }

  if (env.serperApiKey) {
    const query = `${lead.company} ${lead.contact} recent news`;
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": env.serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query }),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        organic?: Array<{ title?: string; snippet?: string }>;
      };
      const signals = (json.organic ?? [])
        .slice(0, 4)
        .map((r) => r.snippet ?? r.title ?? "")
        .filter(Boolean);
      return {
        company: lead.company,
        contact: lead.contact,
        summary: signals[0] ?? `No fresh signals found for ${lead.company}.`,
        signals,
        source: "serper",
      };
    }
  }

  // Apollo path intentionally left as a typed stub — wire the real call here.
  return {
    company: lead.company,
    contact: lead.contact,
    summary: `Apollo enrichment placeholder for ${lead.company}.`,
    signals: [],
    source: "apollo",
  };
}
