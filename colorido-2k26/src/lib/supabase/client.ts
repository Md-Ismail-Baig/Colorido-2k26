"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publishableKey, supabaseUrl } from "./env";

/**
 * Browser Supabase client.
 * Respects RLS — it can only do what the signed-in user (or anon) is allowed to.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, publishableKey);
}
