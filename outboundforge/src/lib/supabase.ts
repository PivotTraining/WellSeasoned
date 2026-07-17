import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, configured } from "./env";

/**
 * Browser/anon client — reads gated by RLS. Returns null when unconfigured
 * so UI can render an honest "connect Supabase" empty state.
 */
export function supabaseBrowser(): SupabaseClient | null {
  if (!configured.supabase) return null;
  return createClient(env.supabaseUrl, env.supabaseAnonKey);
}

/**
 * Server-side privileged client for agent runs / API routes. Uses the
 * service-role key and must NEVER be imported into client components.
 * Falls back to the anon client if no service key is set (read-only).
 */
export function supabaseAdmin(): SupabaseClient | null {
  if (configured.supabaseAdmin) {
    return createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseBrowser();
}
