import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Event, Participant, Registration, Team } from "@/types/database";

export const metadata = { title: "Registration Details" };

export default async function RegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // UUID format check — avoid Postgres cast errors for malformed ids.
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) notFound();

  // The unguessable registration UUID is the capability token for this view
  // (same pattern as order-confirmation links): RLS blocks anonymous reads of
  // registrations, so this trusted server page reads via the service-role
  // client. Only the single registration identified by the URL is exposed —
  // no lists, no enumeration (spec §3).
  const supabase = createAdminClient();

  const { data: reg } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", id)
    .single();

  if (!reg) notFound();

  const registration = reg as Registration;

  const [eventRes, participantRes, teamRes] = await Promise.all([
    supabase
      .from("events")
      .select("name, slug, event_date, venue, registration_mode")
      .eq("id", registration.event_id)
      .single(),
    supabase
      .from("participants")
      .select("*")
      .eq("id", registration.participant_id)
      .single(),
    supabase
      .from("teams")
      .select("id, team_name")
      .eq("registration_id", registration.id)
      .single(),
  ]);

  const event = eventRes.data as Pick<
    Event,
    "name" | "slug" | "event_date" | "venue" | "registration_mode"
  > | null;
  const participant = participantRes.data as Participant | null;
  const team = teamRes.data as Pick<Team, "id" | "team_name"> | null;

  // Team members (team registrations only)
  const { data: members } = team
    ? await supabase
        .from("team_members")
        .select("name, roll_number, role")
        .eq("team_id", team.id)
        .order("role", { ascending: false })
    : { data: null };

  const TBA = <span className="italic text-slate-400">To be announced</span>;

  return (
    <section className="bg-brand-cream py-14">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-burgundy">
              Registration Details
            </p>
            <h1 className="mt-2 font-heading text-3xl font-black tracking-wide text-brand-deep-purple">
              {registration.registration_number}
            </h1>
            <p className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              {registration.status}
            </p>
          </div>

          {event && (
            <div className="mt-8 rounded-xl border border-brand-gold/30 bg-brand-cream p-4 text-sm">
              <p className="font-heading text-lg font-bold text-brand-deep-purple">
                {event.name}
              </p>
              <p className="mt-1 text-slate-600">
                {new Date(`${event.event_date}T00:00:00`).toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "long", year: "numeric" },
                )}{" "}
                · {event.venue ?? "Venue: To be announced"}
              </p>
            </div>
          )}

          {participant && (
            <dl className="mt-8 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {[
                ["Participant", participant.full_name],
                ["Roll Number", participant.roll_number],
                ["Email", participant.email],
                ["Mobile", participant.mobile],
                ["College", participant.college],
                ...(participant.department
                  ? [["Department", participant.department] as const]
                  : []),
                ...(participant.year_of_study
                  ? [["Year of Study", participant.year_of_study] as const]
                  : []),
                ["Gender", participant.gender],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-700">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {team && (
            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Team · {team.team_name}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {((members as { name: string; roll_number: string; role: string }[]) ?? []).map(
                  (m, i) => (
                    <li key={i} className="flex justify-between text-slate-600">
                      <span>
                        {m.name}{" "}
                        {m.role === "captain" && (
                          <span className="text-xs font-semibold text-brand-gold">
                            (Captain)
                          </span>
                        )}
                      </span>
                      <span className="text-slate-400">{m.roll_number}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            Registered {new Date(registration.registered_at).toLocaleString("en-IN")}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {event && (
              <Link
                href={`/events/${event.slug}`}
                className="rounded-full border border-brand-burgundy/30 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-burgundy hover:bg-brand-cream"
              >
                View Event
              </Link>
            )}
            {registration.status === "confirmed" || registration.status === "checked_in" ? (
              <Link
                href={`/check-in/${registration.id}`}
                className="rounded-full bg-brand-deep-purple px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-gold"
              >
                Entry Pass ↗
              </Link>
            ) : null}
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
