import { configured } from "@/lib/env";
import { llmComplete } from "@/lib/llm";
import type { Draft, Enrichment, Lead } from "@/lib/types";

const OPT_OUT = "\n\nNot relevant? Reply “unsubscribe” and I won’t follow up.";

/**
 * Turn an enriched lead into an outreach draft. With an LLM key it writes a
 * real personalized email; without one it returns a clean templated sample
 * (never the raw prompt) so previews and traces stay readable offline. Always
 * appends a CAN-SPAM opt-out line so the draft can clear the compliance gate.
 */
export async function writeDraft(
  lead: Lead,
  enriched: Enrichment,
  icp?: string,
): Promise<Draft> {
  if (!configured.llm) {
    const signal = enriched.signals[0];
    const body =
      `Hi ${lead.contact},\n\n` +
      `I was reading up on ${lead.company}` +
      (signal ? ` and noticed ${signal}` : "") +
      `. Teams like yours${icp ? ` (${icp})` : ""} often struggle to keep ` +
      `outbound personal once volume climbs — that's exactly what we fix.\n\n` +
      `Worth a quick look?` +
      OPT_OUT;
    return { subject: `Quick idea for ${lead.company}`, body, channel: "email" };
  }

  const raw = await llmComplete(
    `Write a short cold outreach email to ${lead.contact} at ${lead.company}. ` +
      (icp ? `ICP: ${icp}. ` : "") +
      `Context: ${enriched.summary}. ` +
      `Signals: ${JSON.stringify(enriched.signals)}. ` +
      `Return "Subject: ...\\n\\n<body>".`,
  );
  const [subjectLine, ...rest] = raw.split("\n");
  const body = rest.join("\n").trim() || raw;
  return {
    subject: subjectLine.replace(/^subject:\s*/i, "").trim() || "Quick idea",
    body: body.includes("unsubscribe") ? body : body + OPT_OUT,
    channel: "email",
  };
}
