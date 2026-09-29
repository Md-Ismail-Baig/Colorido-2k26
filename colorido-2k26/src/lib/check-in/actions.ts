"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.string().uuid();

export interface CheckInState {
  ok?: boolean;
  error?: string;
  message?: string;
}

/**
 * Phase 16 ② — mark a registration as checked in.
 *
 * Shared by the public pass page (/check-in/<uuid>) and the console scanner
 * pages. Guards, in order:
 *   1. staff session required (admin or event_host),
 *   2. event hosts must be assigned to the registration's event
 *      (assertHostEvent → 404 semantics via error string),
 *   3. registration must be confirmed (or already checked in — idempotent).
 *
 * The write uses the service-role client after the session/scope gates —
 * the same trusted-server pattern as every console status action.
 */
export async function checkInRegistration(
  _prev: CheckInState,
  registrationId: string,
): Promise<CheckInState> {
  const session = await getSessionProfile();
  if (!session) return { error: "Sign in as staff to check people in." };

  const parsed = idSchema.safeParse(registrationId);
  if (!parsed.success) return { error: "Invalid registration reference." };

  const supabase = await createClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select("id, event_id, status")
    .eq("id", parsed.data)
    .single();

  if (!reg) return { error: "Registration not found." };

  if (session.profile.role === "event_host") {
    // Inline scope check (not assertHostEvent, which throws notFound —
    // inappropriate inside a server action). A host scanning a pass from an
    // unassigned event gets a clear refusal, never data or a 404 page.
    const supabaseScoped = await createClient();
    const { data: assignment } = await supabaseScoped
      .from("event_host_assignments")
      .select("event_id")
      .eq("host_id", session.profile.id)
      .eq("event_id", reg.event_id)
      .limit(1);
    if (!assignment?.length) {
      return { error: "This pass belongs to an event not assigned to you." };
    }
  }

  if (reg.status === "checked_in") {
    return { ok: true, message: "Already checked in." };
  }
  if (reg.status !== "confirmed") {
    return {
      error: `Only confirmed registrations can be checked in (this one is “${reg.status}”).`,
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("registrations")
    .update({ status: "checked_in" })
    .eq("id", parsed.data);
  if (error) {
    console.error("[check-in] update failed:", error.message);
    return { error: "We couldn't record the check-in. Please try again." };
  }

  revalidatePath("/admin/registrations");
  revalidatePath("/host/registrations");
  revalidatePath("/admin/check-in");
  revalidatePath("/host/check-in");
  return { ok: true };
}
