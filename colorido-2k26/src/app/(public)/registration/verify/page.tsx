import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyVerificationToken } from "@/lib/registration-verify";

export const metadata = { title: "Verify your email — COLORIDO 2K26" };

/**
 * EMAIL VERIFICATION landing page (emailed links).
 *
 * Opened straight from the verification email, so like /check-in/<uuid> it
 * must work without any session or viewer cookie — the unguessable
 * registration UUID plus the HMAC token IS the capability. The token is
 * HMAC-SHA256 over `id:exp` keyed from SUPABASE_SERVICE_ROLE_KEY
 * (domain-separated) — see lib/registration-verify.ts.
 */

interface VerifyOutcome {
  kind: "success" | "error";
  heading: string;
  message: string;
  /** Registration id — lets the UI deep-link to the detail page. */
  registrationId?: string;
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const id = typeof params.id === "string" ? params.id : "";
  const exp = typeof params.exp === "string" ? params.exp : "";
  const token = typeof params.token === "string" ? params.token : "";

  let outcome: VerifyOutcome;

  const check = verifyVerificationToken(id, exp, token);
  if (!check.ok) {
    const messages: Record<typeof check.reason, string> = {
      malformed:
        "This verification link is incomplete. Use the exact link from your email.",
      expired:
        "This verification link has expired. Open your registration page (link in your other email or your browser history) to request a fresh one.",
      invalid:
        "This verification link is not valid. Use the exact link from your email.",
    };
    outcome = {
      kind: "error",
      heading: "Link problem",
      message: messages[check.reason],
    };
  } else {
    const admin = createAdminClient();
    const { data: reg } = await admin
      .from("registrations")
      .select("id, registration_number, status")
      .eq("id", id)
      .single();

    if (!reg) {
      outcome = {
        kind: "error",
        heading: "Registration not found",
        message:
          "We couldn't find the registration this link points to. Contact the fest desk with your registration ID.",
      };
    } else if (reg.status === "pending") {
      // Guarded update: a raced second tab finds zero rows and still shows success.
      const { error } = await admin
        .from("registrations")
        .update({ status: "confirmed" })
        .eq("id", id)
        .eq("status", "pending");

      outcome = error
        ? {
            kind: "error",
            heading: "Almost done",
            message:
              "We verified your link but couldn't update the registration just now — it may already be confirmed. Open your registration page in a moment.",
            registrationId: reg.id,
          }
        : {
            kind: "success",
            heading: "Email verified!",
            message: `Your email is verified and registration ${reg.registration_number} is confirmed. See you at COLORIDO 2K26!`,
            registrationId: reg.id,
          };
    } else if (reg.status === "confirmed" || reg.status === "checked_in") {
      outcome = {
        kind: "success",
        heading: "Already verified",
        message: `Registration ${reg.registration_number} is already confirmed — nothing more to do.`,
        registrationId: reg.id,
      };
    } else {
      // rejected / cancelled — a stale link for a withdrawn registration.
      outcome = {
        kind: "error",
        heading: "Registration unavailable",
        message: `Registration ${reg.registration_number} is no longer active. Contact the fest desk if this is unexpected.`,
        registrationId: reg.id,
      };
    }
  }

  return (
    <section className="bg-brand-cream py-16">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          {outcome.kind === "success" ? (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
              ✓
            </div>
          ) : (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-600">
              !
            </div>
          )}
          <h1
            className={`font-heading text-2xl font-bold ${
              outcome.kind === "success"
                ? "text-emerald-700"
                : "text-brand-deep-purple"
            }`}
          >
            {outcome.heading}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {outcome.message}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {outcome.registrationId && (
              <Link
                href={`/registration/${outcome.registrationId}`}
                className="rounded-full bg-brand-deep-purple px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-gold"
              >
                View Registration
              </Link>
            )}
            <Link
              href="/events"
              className="rounded-full border border-slate-300 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
            >
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
