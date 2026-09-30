/**
 * Phase 16 ③ — transactional email (confirmation + status notifications).
 *
 * Uses Resend's REST API directly (no SDK dependency). Behavior is graceful
 * by design: without RESEND_API_KEY the senders log and no-op so local dev,
 * previews and the E2E suite keep working unchanged; with a key, failures are
 * logged but NEVER break the user flow (a registration must not fail because
 * a mail provider hiccupped).
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Resend's sandbox sender works for any verified account; override in prod. */
const DEFAULT_FROM = "COLORIDO 2K26 <onboarding@resend.dev>";

export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface SendResult {
  sent: boolean;
  error?: string;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  if (!apiKey) {
    console.log(
      `[email] RESEND_API_KEY not set — skipped "${opts.subject}" to ${opts.to}`,
    );
    return { sent: false };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] resend ${res.status}:`, body.slice(0, 300));
      return { sent: false, error: `resend ${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email] send failed:", e);
    return { sent: false, error: "network" };
  }
}

// ------------------------------------------------------------ templates -----
const BRANDED = (title: string, body: string): string => `
<div style="background:#f6f2ea;padding:24px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#2d1b4e;padding:20px 24px;">
      <p style="margin:0;color:#e6c36a;font-size:10px;letter-spacing:0.25em;font-weight:bold;">COLORIDO 2K26</p>
      <h1 style="margin:6px 0 0;color:#ffffff;font-size:18px;">${title}</h1>
    </div>
    <div style="padding:24px;color:#334155;font-size:14px;line-height:1.6;">${body}</div>
    <div style="padding:14px 24px;background:#f6f2ea;color:#94a3b8;font-size:11px;text-align:center;">
      Cultural &amp; Sports Fest · 28 December 2026
    </div>
  </div>
</div>`;

const row = (label: string, value?: string | null) =>
  value
    ? `<tr><td style="padding:6px 0;color:#64748b;font-size:12px;width:110px;">${label}</td><td style="padding:6px 0;font-weight:bold;color:#0f172a;">${value}</td></tr>`
    : "";

export interface RegistrationEmailData {
  to: string;
  participantName: string;
  registrationNumber: string;
  registrationId: string;
  eventName: string;
  eventDate?: string | null;
  venue?: string | null;
  teamName?: string | null;
  appUrl: string;
}

/** Registration confirmation (individual or team, captain receives it). */
export function registrationConfirmationEmail(
  d: RegistrationEmailData,
): { subject: string; html: string } {
  const detailsUrl = `${d.appUrl}/registration/${d.registrationId}`;
  const passUrl = `${d.appUrl}/check-in/${d.registrationId}`;
  const subject = `Registration confirmed — ${d.eventName} (${d.registrationNumber})`;
  const body = `
    <p>Hi ${escapeHtml(d.participantName)},</p>
    <p>Your registration for <strong>${escapeHtml(d.eventName)}</strong> is confirmed. 🎉</p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      ${row("Registration", escapeHtml(d.registrationNumber))}
      ${row("Event", escapeHtml(d.eventName))}
      ${row("Date", formatDate(d.eventDate))}
      ${row("Venue", d.venue ? escapeHtml(d.venue) : "To be announced")}
      ${row("Team", d.teamName ? escapeHtml(d.teamName) : null)}
    </table>
    <p style="margin:16px 0 4px;">
      <a href="${passUrl}" style="background:#2d1b4e;color:#e6c36a;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:12px;font-weight:bold;">
        VIEW YOUR ENTRY PASS
      </a>
    </p>
    <p style="color:#94a3b8;font-size:12px;">Show the QR code at the gate.
    Full details: <a href="${detailsUrl}" style="color:#7c3aed;">${detailsUrl}</a></p>`;
  return { subject, html: BRANDED("Registration Confirmed", body) };
}

/** Status change after staff review (confirm / reject / cancel). */
export function registrationStatusEmail(d: {
  to: string;
  participantName: string;
  registrationNumber: string;
  registrationId: string;
  eventName: string;
  status: "confirmed" | "rejected" | "cancelled";
  appUrl: string;
}): { subject: string; html: string } {
  const detailsUrl = `${d.appUrl}/registration/${d.registrationId}`;
  const verdict =
    d.status === "confirmed"
      ? "Your registration was <strong style=\"color:#059669;\">approved</strong>. See you at the venue!"
      : d.status === "rejected"
        ? "Unfortunately your registration was <strong style=\"color:#dc2626;\">not approved</strong>. Contact the fest desk if you believe this is a mistake."
        : "Your registration was <strong style=\"color:#dc2626;\">cancelled</strong>. You can register again while the event is open.";
  const body = `
    <p>Hi ${escapeHtml(d.participantName)},</p>
    <p>An update on your registration <strong>${escapeHtml(d.registrationNumber)}</strong> for <strong>${escapeHtml(d.eventName)}</strong>:</p>
    <p>${verdict}</p>
    <p style="margin:16px 0 4px;">
      <a href="${detailsUrl}" style="background:#2d1b4e;color:#e6c36a;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:12px;font-weight:bold;">
        VIEW REGISTRATION
      </a>
    </p>`;
  const subject =
    d.status === "confirmed"
      ? `Approved — ${d.eventName} (${d.registrationNumber})`
      : `Registration ${d.status} — ${d.eventName} (${d.registrationNumber})`;
  return { subject, html: BRANDED("Registration Update", body) };
}

/**
 * Email-verification request — sent right after registration while the
 * registration sits in `pending`. The participant must open the signed link
 * to confirm their address before the registration becomes `confirmed`.
 */
export function registrationVerificationEmail(d: {
  participantName: string;
  registrationNumber: string;
  eventName: string;
  verifyUrl: string;
  expiresAt: Date;
}): { subject: string; html: string } {
  const expiry = d.expiresAt.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  const subject = `Verify your email — COLORIDO 2K26 registration ${d.registrationNumber}`;
  const body = `
    <p>Hi ${escapeHtml(d.participantName)},</p>
    <p>Almost there! Confirm your email address to activate your registration for
    <strong>${escapeHtml(d.eventName)}</strong> <strong>${escapeHtml(d.registrationNumber)}</strong>.</p>
    <p style="margin:16px 0 4px;">
      <a href="${d.verifyUrl}" style="background:#2d1b4e;color:#e6c36a;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:12px;font-weight:bold;">
        VERIFY MY EMAIL
      </a>
    </p>
    <p style="color:#64748b;font-size:12px;">This link works until <strong>${expiry}</strong> (IST).
    If the button doesn't work, copy this address into your browser:<br />
    <a href="${d.verifyUrl}" style="color:#7c3aed;word-break:break-all;">${d.verifyUrl}</a></p>
    <p style="color:#94a3b8;font-size:12px;">Didn't register for COLORIDO 2K26? You can safely ignore this email —
    the registration stays unconfirmed and no mail will be sent again.</p>`;
  return { subject, html: BRANDED("Confirm your email", body) };
}

// -------------------------------------------------------------- helpers -----
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** The site's own origin — required so pass links point at the right host. */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3100";
}
