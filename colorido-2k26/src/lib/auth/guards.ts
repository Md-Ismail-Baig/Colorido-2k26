import { redirect } from "next/navigation";
import { getSessionProfile } from "./session";

/**
 * Guard for pages that require signed-out visitors (e.g. /login).
 * Signed-in staff are redirected to their role's dashboard.
 */
export async function requireAnon(): Promise<void> {
  const session = await getSessionProfile();
  if (session) {
    redirect(session.profile.role === "admin" ? "/admin" : "/host");
  }
}
