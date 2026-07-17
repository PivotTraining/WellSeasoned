/**
 * Central config-gating. Nothing in OutboundForge throws when a key is
 * missing — callers check the `configured` flags and degrade gracefully
 * (return a "not configured" result instead of making a live call).
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",

  resendApiKey: process.env.RESEND_API_KEY ?? "",
  outreachFromEmail: process.env.OUTREACH_FROM_EMAIL ?? "",

  serperApiKey: process.env.SERPER_API_KEY ?? "",
  apolloApiKey: process.env.APOLLO_API_KEY ?? "",
};

export const configured = {
  /** Public Supabase client can be built (browser + server reads). */
  get supabase() {
    return Boolean(env.supabaseUrl && env.supabaseAnonKey);
  },
  /** Privileged server-side Supabase client (agent writes, auth bypass). */
  get supabaseAdmin() {
    return Boolean(env.supabaseUrl && env.supabaseServiceKey);
  },
  get llm() {
    return Boolean(env.openaiApiKey);
  },
  get outreach() {
    return Boolean(env.resendApiKey && env.outreachFromEmail);
  },
  get research() {
    return Boolean(env.serperApiKey || env.apolloApiKey);
  },
};

export type ConfigKey = keyof typeof configured;
