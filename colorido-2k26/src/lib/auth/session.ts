import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export interface SessionProfile {
  user: { id: string; email?: string };
  profile: Profile;
}

/**
 * Returns the signed-in staff user + their app profile (role), or null.
 * Cached per-request so multiple components share one lookup.
 * Authorization truth comes from the database (profiles.role), never the UI.
 */
export const getSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (!profile) return null;

    return {
      user: { id: user.id, email: user.email ?? undefined },
      profile: profile as Profile,
    };
  },
);

/**
 * Route guard for server components. Redirects when unauthorized:
 *  - not signed in  → /login
 *  - wrong role     → their own dashboard
 */
export async function requireRole(role: UserRole): Promise<SessionProfile> {
  const session = await getSessionProfile();

  if (!session) redirect("/login");

  if (session.profile.role !== role) {
    redirect(session.profile.role === "admin" ? "/admin" : "/host");
  }

  return session;
}
