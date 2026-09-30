/**
 * Phase 16 ③ — fire-and-forget notification orchestrator.
 *
 * Resolves participant/event context and sends the right email, but never
 * blocks or fails the calling flow: it awaits nothing from the caller's
 * perspective (void), swallows its own errors, and no-ops entirely when
 * RESEND_API_KEY is unset. Mail is a courtesy — the database is the truth.
 */
import {
  isEmailEnabled,
  getAppUrl,
  sendEmail,
  registrationConfirmationEmail,
  registrationStatusEmail,
  registrationVerificationEmail,
} from "./email";
import {
  issueVerificationToken,
  verificationLink,
} from "./registration-verify";
import { createAdminClient } from "@/lib/supabase/admin";

interface RegContext {
  id: string;
  registration_number: string;
  event_id: string;
  participant_id: string;
  mode: string;
}

async function resolveContext(registrationId: string) {
  const admin = createAdminClient();
  const { data: reg } = await admin
    .from("registrations")
    .select("id, registration_number, event_id, participant_id, mode")
    .eq("id", registrationId)
    .single();
  if (!reg) return null;
  const context = reg as RegContext;

  const [eventRes, participantRes] = await Promise.all([
    admin.from("events").select("name, event_date, venue").eq("id", context.event_id).single(),
    admin
      .from("participants")
      .select("full_name, email")
      .eq("id", context.participant_id)
      .single(),
  ]);
  if (!eventRes.data || !participantRes.data?.email) return null;

  // Team name (captain's email is the participant's own).
  let teamName: string | null = null;
  if (context.mode === "team") {
    const { data: team } = await admin
      .from("teams")
      .select("team_name")
      .eq("registration_id", context.id)
      .single();
    teamName = team?.team_name ?? null;
  }

  return {
    context,
    event: eventRes.data as { name: string; event_date: string | null; venue: string | null },
    participant: participantRes.data as { full_name: string; email: string },
    teamName,
  };
}

/**
 * Send the email-verification request for a pending registration.
 * Returns the outcome so the registration action can tell the participant
 * whether mail actually went out; never throws.
 */
export async function sendRegistrationVerification(
  registrationId: string,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    if (!isEmailEnabled()) return { sent: false, reason: "email-disabled" };
    const issued = issueVerificationToken(registrationId);
    if (!issued) return { sent: false, reason: "token-key-unavailable" };
    const ctx = await resolveContext(registrationId);
    if (!ctx?.participant.email) return { sent: false, reason: "no-context" };

    const { subject, html } = registrationVerificationEmail({
      participantName: ctx.participant.full_name,
      registrationNumber: ctx.context.registration_number,
      eventName: ctx.event.name,
      verifyUrl: verificationLink(getAppUrl(), registrationId, issued),
      expiresAt: issued.expiresAt,
    });
    const result = await sendEmail({ to: ctx.participant.email, subject, html });
    return result.sent ? { sent: true } : { sent: false, reason: result.error };
  } catch (e) {
    console.error("[email-notifications] verification send failed:", e);
    return { sent: false, reason: "exception" };
  }
}

/** Send the registration confirmation (call right after a successful insert). */
export function notifyRegistrationConfirmed(registrationId: string): void {
  void (async () => {
    try {
      if (!isEmailEnabled()) return;
      const ctx = await resolveContext(registrationId);
      if (!ctx) return;
      const { subject, html } = registrationConfirmationEmail({
        to: ctx.participant.email,
        participantName: ctx.participant.full_name,
        registrationNumber: ctx.context.registration_number,
        registrationId: ctx.context.id,
        eventName: ctx.event.name,
        eventDate: ctx.event.event_date,
        venue: ctx.event.venue,
        teamName: ctx.teamName,
        appUrl: getAppUrl(),
      });
      const { sendEmail } = await import("./email");
      await sendEmail({ to: ctx.participant.email, subject, html });
    } catch (e) {
      console.error("[email-notifications] confirmation failed:", e);
    }
  })();
}

/** Notify the participant about a staff status decision. */
export function notifyRegistrationStatus(
  registrationId: string,
  status: "confirmed" | "rejected" | "cancelled",
): void {
  void (async () => {
    try {
      if (!isEmailEnabled()) return;
      const ctx = await resolveContext(registrationId);
      if (!ctx) return;
      const { subject, html } = registrationStatusEmail({
        to: ctx.participant.email,
        participantName: ctx.participant.full_name,
        registrationNumber: ctx.context.registration_number,
        registrationId: ctx.context.id,
        eventName: ctx.event.name,
        status,
        appUrl: getAppUrl(),
      });
      const { sendEmail } = await import("./email");
      await sendEmail({ to: ctx.participant.email, subject, html });
    } catch (e) {
      console.error("[email-notifications] status notify failed:", e);
    }
  })();
}
