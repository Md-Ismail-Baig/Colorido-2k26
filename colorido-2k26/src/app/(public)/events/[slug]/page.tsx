import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, EventStatusBadge } from "@/components/ui/badge";
import { EventCard } from "@/components/events/event-card";
import { createClient } from "@/lib/supabase/server";
import type { Announcement, Event, ResultEntry, ScheduleSlot } from "@/types/database";

/** Dynamic SEO per event (spec §13). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("name, description")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!data) return { title: "Event not found" };
  return {
    title: data.name,
    description: data.description?.slice(0, 160),
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("is_active", true)
    .single();

  if (!event) notFound();

  const ev = event as Event;

  // Related public data for this event — published rows only.
  const [scheduleRes, annRes, resultsRes] = await Promise.all([
    supabase
      .from("schedules")
      .select("*")
      .eq("event_id", ev.id)
      .eq("is_published", true)
      .order("start_time"),
    supabase
      .from("announcements")
      .select("*")
      .eq("event_id", ev.id)
      .eq("status", "published"),
    supabase
      .from("results")
      .select("*")
      .eq("event_id", ev.id)
      .eq("status", "published")
      .order("position"),
  ]);

  const schedule = (scheduleRes.data ?? []) as ScheduleSlot[];
  const announcements = (annRes.data ?? []) as Announcement[];
  const results = (resultsRes.data ?? []) as ResultEntry[];

  const isCultural = ev.category === "cultural";
  const dateLabel = new Date(`${ev.event_date}T00:00:00`).toLocaleDateString(
    "en-IN",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );

  const TBA = (
    <span className="italic text-slate-400">To be announced</span>
  );

  return (
    <>
      {/* Hero */}
      <section
        className={`relative overflow-hidden py-16 text-white ${
          isCultural
            ? "bg-gradient-to-b from-brand-deep-purple via-brand-purple to-brand-royal"
            : "bg-gradient-to-b from-brand-deep-purple via-brand-royal to-sky-900"
        }`}
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-white/60">
            <Link href="/" className="hover:text-brand-gold">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/events" className="hover:text-brand-gold">Events</Link>
            <span className="mx-2">/</span>
            <span className="text-white/80">{ev.name}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={isCultural ? "gold" : "cyan"}>
              {isCultural ? "Cultural" : `Sports · ${ev.gender}`}
            </Badge>
            {ev.subcategory && <Badge tone="neutral">{ev.subcategory}</Badge>}
            <EventStatusBadge status={ev.status} />
          </div>

          <h1 className="mt-4 font-heading text-4xl font-black sm:text-6xl">
            {ev.name}
          </h1>

          <p className="mt-4 max-w-2xl text-base text-slate-200 sm:text-lg">
            {ev.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            {ev.status === "published" ? (
              <Link
                href={`/registration?event=${ev.id}`}
                className="rounded-full bg-gradient-to-r from-brand-gold via-brand-light-gold to-brand-gold px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-brand-deep-purple transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-gold/20"
              >
                Register Now
              </Link>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center rounded-full border border-white/20 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-white/40">
                {ev.status === "completed" ? "Event Completed" : "Registration Closed"}
              </span>
            )}
            <Link
              href="/events"
              className="rounded-full border border-white/30 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:border-brand-gold"
            >
              All Events
            </Link>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="bg-brand-cream py-16">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {/* Main column */}
          <div className="space-y-10 lg:col-span-2">
            {/* Quick facts */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                ["Event Date", <span key="d">{dateLabel}</span>],
                ["Venue", ev.venue ?? TBA],
                ["Reporting Time", ev.reporting_time ?? TBA],
                ["Start Time", ev.start_time ?? TBA],
                ["End Time", ev.end_time ?? TBA],
                ["Registration Deadline", ev.registration_deadline ?? TBA],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
                </div>
              ))}
            </div>

            {/* Rules / Eligibility / Judging */}
            <DetailBlock title="Eligibility" body={ev.eligibility} />
            <DetailBlock title="Rules" body={ev.rules} />
            <DetailBlock title="Judging Criteria" body={ev.judging_criteria} />

            {/* Schedule */}
            <div>
              <h2 className="mb-4 font-heading text-2xl font-bold text-brand-deep-purple">
                Event Schedule
              </h2>
              {schedule.length === 0 ? (
                <p className="text-sm italic text-slate-500">
                  Schedule — To be announced
                </p>
              ) : (
                <ol className="space-y-3">
                  {schedule.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <Badge tone="gold">{s.round ?? "Round"}</Badge>
                      <span className="text-sm font-medium text-slate-700">
                        {s.start_time ?? "TBA"}
                        {s.end_time ? ` – ${s.end_time}` : ""}
                      </span>
                      <span className="text-sm text-slate-500">{s.venue ?? ""}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Event announcements */}
            {announcements.length > 0 && (
              <div>
                <h2 className="mb-4 font-heading text-2xl font-bold text-brand-deep-purple">
                  Event Announcements
                </h2>
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <article
                      key={a.id}
                      className="rounded-xl border border-brand-gold/30 bg-white p-4 shadow-sm"
                    >
                      <h3 className="font-heading font-bold text-brand-deep-purple">
                        {a.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">{a.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div>
                <h2 className="mb-4 font-heading text-2xl font-bold text-brand-deep-purple">
                  Results
                </h2>
                <ol className="space-y-2">
                  {results.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gold font-heading font-bold text-brand-deep-purple">
                        {r.position}
                      </span>
                      <span className="font-medium text-slate-700">
                        {r.team_name ?? r.participant_name ?? "—"}
                      </span>
                      {r.college && (
                        <span className="text-sm text-slate-500">{r.college}</span>
                      )}
                      {r.score && <Badge tone="cyan">Score: {r.score}</Badge>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-heading text-lg font-bold text-brand-deep-purple">
                Participation
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Mode</dt>
                  <dd className="font-semibold text-slate-700">
                    {ev.registration_mode === "team"
                      ? `Team of ${ev.team_size_min}–${ev.team_size_max}`
                      : "Individual"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Open to</dt>
                  <dd className="font-semibold text-slate-700">
                    {ev.gender === "open"
                      ? "All"
                      : ev.gender === "boys"
                        ? "Boys"
                        : "Girls"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Duplicate policy</dt>
                  <dd className="font-semibold text-slate-700">
                    {ev.duplicate_policy === "event"
                      ? "One entry per participant"
                      : "One entry per college & roll no."}
                  </dd>
                </div>
              </dl>
              {ev.status === "published" && (
                <Link
                  href={`/registration?event=${ev.id}`}
                  className="mt-6 block rounded-full bg-gradient-to-r from-brand-gold via-brand-light-gold to-brand-gold py-3 text-center text-sm font-semibold uppercase tracking-wider text-brand-deep-purple transition hover:shadow-lg hover:shadow-brand-gold/30"
                >
                  Register Now
                </Link>
              )}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function DetailBlock({ title, body }: { title: string; body: string | null }) {
  return (
    <div>
      <h2 className="mb-3 font-heading text-2xl font-bold text-brand-deep-purple">
        {title}
      </h2>
      {body ? (
        <div className="whitespace-pre-line rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600 shadow-sm">
          {body}
        </div>
      ) : (
        <p className="text-sm italic text-slate-500">To be announced</p>
      )}
    </div>
  );
}
