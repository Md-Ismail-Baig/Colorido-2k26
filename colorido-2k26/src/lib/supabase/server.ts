import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publishableKey, supabaseUrl } from "./env";

/**
 * Server Supabase client (Server Components, Server Actions, Route Handlers).
 * Carries the user's auth cookie, so queries respect RLS for that user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component render — safe to ignore when the
          // middleware refreshes sessions instead.
        }
      },
    },
  });
}
