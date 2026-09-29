import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * SERVER-ONLY service-role client. Bypasses RLS.
 *
 * Never import this from a client component ("use client") and never read
 * SUPABASE_SERVICE_ROLE_KEY in browser code.
 *
 * Used for trusted server-side operations (admin server actions, scheduled
 * jobs). Every call site must perform its own explicit authorization checks.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to .env.local " +
        "(Supabase Dashboard → Project Settings → API → service_role).",
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * True when the server has a service-role key configured.
 * Lets pages render a clear "not configured" state instead of crashing.
 */
export function isAdminClientConfigured() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
