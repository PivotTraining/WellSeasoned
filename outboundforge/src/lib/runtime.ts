import { configured, env } from "./env";
import { logStep as storeLogStep } from "./store";
import { checkCompliance, type ComplianceResult } from "@/agents/compliance";
import type { Draft, Lead } from "./types";

/** Append a step to the agent log (Supabase or in-memory store). */
export async function logStep(
  campaignId: string,
  step: string,
  input: unknown,
  output: unknown,
): Promise<void> {
  await storeLogStep(campaignId, step, input, output);
}

export interface SendResult {
  sent: boolean;
  reason?: string;
  id?: string;
  compliance?: ComplianceResult;
}

/**
 * Deliver an outreach draft via Resend, gated by a pre-send compliance check.
 * Config-gated: without a Resend key it returns "not configured" instead of
 * sending. A failing compliance check blocks the send outright — no email
 * leaves without passing the gate.
 */
export async function sendOutreach(
  lead: Lead,
  draft: Draft | undefined,
): Promise<SendResult> {
  if (!draft) return { sent: false, reason: "no-draft" };

  const compliance = await checkCompliance(`${draft.subject}\n\n${draft.body}`);
  if (!compliance.safe) {
    return { sent: false, reason: "compliance-block", compliance };
  }

  if (!configured.outreach) {
    return { sent: false, reason: "outreach-not-configured", compliance };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(env.resendApiKey);
  const to = lead.context?.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  if (!to) return { sent: false, reason: "no-recipient-email", compliance };

  const { data, error } = await resend.emails.send({
    from: env.outreachFromEmail,
    to,
    subject: draft.subject,
    text: draft.body,
  });
  if (error) return { sent: false, reason: error.message, compliance };
  return { sent: true, id: data?.id, compliance };
}
