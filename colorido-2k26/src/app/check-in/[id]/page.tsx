import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { qrSvg } from "@/lib/qr";
import type { Event, Participant, Registration } from "@/types/database";

export const metadata = { title: "Check-in Pass · COLORIDO 2K26" };

const STATUS_STYLES: Record<
  string,
  { label: string; pill: string; note: string }
> = {
  confirmed: {
    label: "Confirmed",
    pill: "bg-emerald-50 text-emerald-700",
    note: "Show this QR code at the venue entrance — one scan per participant.",
  },
  checked_in: {
    label: "Checked in",
    pill: "bg-sky-50 text-sky-700",
    note: "This pass has already been used to check in.",
  },
  pending: {
    label: "Pending review",
    pill: "bg-amber-50 text-amber-700",
    note: "This registration is awaiting staff confirmation — check back later.",
  },
  cancelled: {
    label: "Cancelled",
    pill: "bg-red-50 text-red-700",
    note: "This registration was cancelled and cannot be used for entry.",
  },
  rejected: {
    label: "Rejected",
    pill: "bg-red-50 text-red-700",
    note: "This registration was rejected and cannot be used for entry.",
  },
};

/**
 * Phase 16 ② — the public check-in pass.
 *
 * Route = the registration UUID (same capability-token pattern as
 * /registration/[id]): unguessable, holds no personal data beyond what the
 * registrant already knows, and only exposes this single registration.
 * The QR encodes the pass URL itself, so any staff scanner page can consume
 * either a camera scan or a pasted link.
 */
export default async function CheckInPassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) notFound();

  const admin = createAdminClient();
  const { data: reg } = await admin
    .from("registrations")
    .select("*")
    .eq("id", id)
    .single();
  if (!reg) notFound();

  const registration = reg as Registration;
  const [eventRes, participantRes] = await Promise.all([
    admin
      .from("events")
      .select("name, event_date, venue, reporting_time")
      .eq("id", registration.event_id)
      .single(),
    admin
      .from("participants")
      .select("full_name, college")
      .eq("id", registration.participant_id)
      .single(),
  ]);

  const event = eventRes.data as Pick<
    Event,
    "name" | "event_date" | "venue" | "reporting_time"
  > | null;
  const participant = participantRes.data as Pick<
    Participant,
    "full_name" | "college"
  > | null;

  const status =
    STATUS_STYLES[registration.status] ?? STATUS_STYLES.confirmed;

  // The QR encodes this pass URL — scanners accept the code or the link.
  const passUrl = `/check-in/${registration.id}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-deep-purple px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-brand-light-gold">
          COLORIDO 2K26 · Cultural &amp; Sports Fest
        </p>

        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          {/* Pass header */}
          <div className="bg-brand-deep-purple px-6 py-5 text-center text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-light-gold">
              Entry Pass
            </p>
            <h1 className="mt-1 font-heading text-xl font-black tracking-wide">
              {registration.registration_number}
            </h1>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${status.pill}`}
            >
              {status.label}
            </span>
          </div>

          {/* QR */}
          <div className="flex flex-col items-center px-6 py-6">
            <div
              className="w-56 max-w-full [&_svg]:h-auto [&_svg]:w-full"
              // Server-generated SVG from our own encoder — no user input
              // reaches the markup.
              dangerouslySetInnerHTML={{ __html: qrSvg(passUrl, 6) }}
            />
            <p className="mt-3 text-center font-mono text-[11px] leading-relaxed text-slate-400">
              {registration.registration_number}
              <br />
              {registration.id}
            </p>
          </div>

          {/* Details */}
          <dl className="divide-y divide-slate-100 border-t border-slate-100 text-sm">
            {[
              ["Participant", participant?.full_name],
              ["Event", event?.name],
              [
                "Date",
                event?.event_date
                  ? new Date(`${event.event_date}T00:00:00`).toLocaleDateString(
                      "en-IN",
                      { day: "numeric", month: "short", year: "numeric" },
                    )
                  : null,
              ],
              ["Venue", event?.venue],
              ["Reporting", event?.reporting_time],
            ].map(([label, value]) => (
              <div key={label as string} className="flex gap-3 px-6 py-2.5">
                <dt className="w-24 shrink-0 text-xs uppercase tracking-wider text-slate-400">
                  {label}
                </dt>
                <dd className="min-w-0 flex-1 text-right font-medium text-slate-700">
                  {value || <span className="italic text-slate-300">TBA</span>}
                </dd>
              </div>
            ))}
          </dl>

          <p className="border-t border-slate-100 bg-brand-cream px-6 py-4 text-center text-xs leading-relaxed text-slate-500">
            {status.note}
          </p>
        </div>

        <p className="mt-4 text-center text-[10px] text-white/40">
          Keep this pass on your phone — a screenshot works too.
        </p>
      </div>
    </main>
  );
}
