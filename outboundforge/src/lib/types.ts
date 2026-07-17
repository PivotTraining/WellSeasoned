import { z } from "zod";

export const ICPSchema = z.object({
  description: z.string(),
  industry: z.string().optional(),
  titles: z.array(z.string()).optional(),
  voice: z.string().optional(),
});
export type ICP = z.infer<typeof ICPSchema>;

export const LeadSchema = z.object({
  company: z.string(),
  contact: z.string(),
  url: z.string().optional(),
  context: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type Lead = z.infer<typeof LeadSchema>;

/**
 * Parse a pasted lead list. One lead per line:
 *   "Company, Contact Name, email@domain.com"  (comma or | separated)
 * Email is optional and stored in `context` so the send path can find it.
 */
export function parseLeads(raw: string): Lead[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [company, contact, email] = line
        .split(/[,|]/)
        .map((s) => s.trim());
      return {
        company: company || "Unknown company",
        contact: contact || "there",
        context: email ? `email: ${email}` : undefined,
      } satisfies Lead;
    });
}

export const EnrichmentSchema = z.object({
  company: z.string(),
  contact: z.string(),
  summary: z.string(),
  signals: z.array(z.string()).default([]),
  source: z.enum(["serper", "apollo", "stub"]),
});
export type Enrichment = z.infer<typeof EnrichmentSchema>;

export const DraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
  channel: z.enum(["email", "linkedin", "voice"]).default("email"),
});
export type Draft = z.infer<typeof DraftSchema>;

export type CampaignStatus = "draft" | "running" | "paused" | "done";
export type LeadStatus =
  | "queued"
  | "researching"
  | "personalizing"
  | "sent"
  | "skipped"
  | "error";

export interface Campaign {
  id: string;
  user_id: string | null;
  name: string;
  icp: ICP;
  status: CampaignStatus;
  metrics: Record<string, number>;
  created_at?: string;
}
