"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { allow } from "@/lib/rate-limit";
import type { UserRole } from "@/types/database";

export interface StaffLoginState {
  error?: string;
}

const staffCredentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** Map Supabase auth errors to safe user-facing messages (no stack traces). */
function safeAuthError(code?: string): string {
  switch (code) {
    case "invalid_credentials":
      return "Invalid email or password.";
    case "email_not_confirmed":
      return "This account has not been confirmed yet. Contact the fest admin.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return "We couldn't sign you in right now. Please try again.";
  }
}

/**
 * Staff login (Admin / Event Host). Path B of the entry flow.
 * Participants do not sign in here — they use the public site directly.
 * Redirect target is decided by the DATABASE role, never by the form.
 */
export async function signInStaff(
  _prevState: StaffLoginState,
  formData: FormData,
): Promise<StaffLoginState> {
  // Phase 13: brute-force guard on staff sign-in per IP.
  if (!(await allow("login"))) {
    return { error: "Too many sign-in attempts. Please wait a few minutes and try again." };
  }

  const parsed = staffCredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    console.error("[auth] staff sign-in failed:", error?.code, error?.message);
    return { error: safeAuthError(error?.code) };
  }

  // Role check happens server-side against the database.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role: UserRole = (profile?.role as UserRole | undefined) ?? "event_host";

  redirect(role === "admin" ? "/admin" : "/host");
}

/**
 * Path A — admit the visitor to the public festival site.
 * Sets the viewer cookie the middleware gate checks, then releases the
 * preserved deep link (validated same-site absolute path only).
 */
export async function enterAsViewer(formData: FormData): Promise<void> {
  const raw = String(formData.get("next") ?? "/");
  const next =
    raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")
      ? raw
      : "/";

  const cookieStore = await cookies();
  cookieStore.set("clr_viewer", "1", {
    httpOnly: false, // the middleware reads it on every navigation
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days — returning visitors skip the gate
  });

  redirect(next);
}

/** Sign out and return to the login page. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete("clr_viewer");
  redirect("/login");
}
