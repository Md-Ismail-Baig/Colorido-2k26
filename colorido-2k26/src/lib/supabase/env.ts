/**
 * Centralized Supabase environment configuration.
 *
 * - NEXT_PUBLIC_* values are safe for the browser.
 * - SUPABASE_SERVICE_ROLE_KEY is SERVER-ONLY and must never be imported
 *   from a client component (see admin.ts, which throws when missing).
 */

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error(
    "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL in .env.local.",
  );
}

if (
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  throw new Error(
    "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY " +
      "(or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local.",
  );
}

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
export const publishableKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) as string;
