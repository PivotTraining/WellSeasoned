import { configured, env } from "./env";
import { supabaseAdmin } from "./supabase";
import type { Draft, Lead } from "./types";

/** Append a step to agent_logs. No-op when Supabase isn't configured. */
export async function logStep(
  campaignId: string,
  step: string,
  input: unknown,
  output: unknown,
): Promise<void> {
  const db = supabaseAdmin();
  if (!db) {
    // eslint-disable-next-line no-console
    console.log(`[agent_log:${step}]`, campaignId);
    return;
  }
  await db.from("agent_logs").insert({
    campaign_id: campaignId,
    step,
    input,
    output,
    timestamp: new Date().toISOString(),
  });
}

export interface SendResult {
  sent: boolean;
  reason?: string;
  id?: string;
}

/**
 * Deliver an outreach draft via Resend. Config-gated: without a key it
 * returns a "not configured" result instead of sending — the graph treats
 * that as a completed (skipped) run, never a fabricated send.
 */
export async function sendOutreach(
  lead: Lead,
  draft: Draft | undefined,
): Promise<SendResult> {
  if (!draft) return { sent: false, reason: "no-draft" };
  if (!configured.outreach) {
    return { sent: false, reason: "outreach-not-configured" };
  }
  const { Resend } = await import("resend");
  const resend = new Resend(env.resendApiKey);
  const to = lead.context?.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  if (!to) return { sent: false, reason: "no-recipient-email" };

  const { data, error } = await resend.emails.send({
    from: env.outreachFromEmail,
    to,
    subject: draft.subject,
    text: draft.body,
  });
  if (error) return { sent: false, reason: error.message };
  return { sent: true, id: data?.id };
}
