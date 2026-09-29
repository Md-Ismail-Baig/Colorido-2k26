import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getPublishedSchedule } from "@/lib/queries/public";

export const metadata = { title: "Schedule" };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; date?: string; venue?: string }>;
}) {
  const sp = await searchParams;
  const { data, error } = await getPublishedSchedule();

  const slots = data ?? [];
  const dates = [...new Set(slots.map((s) => s.event_date))];
  const venues = [...new Set(slots.map((s) => s.venue).filter(Boolean))] as string[];

  // Join event names client-side of the query (slots carry event_id).
  const filtered = slots.filter(
    (s) =>
      (!sp.date || s.event_date === sp.date) &&
      (!sp.venue || s.venue === sp.venue),
  );

  const TBA = <span className="italic text-slate-400">To be announced</span>;

  return (
    <section className="bg-brand-cream py-14">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-burgundy">
            Festival Program
          </p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-brand-deep-purple sm:text-5xl">
            Schedule
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
            Published timings for 28 December 2026.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <FilterChip href="/schedule" active={!sp.date && !sp.venue}>
            All
          </FilterChip>
          {dates.map((d) => (
            <FilterChip
              key={d}
              href={`/schedule?date=${d}`}
              active={sp.date === d}
            >
              {new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </FilterChip>
          ))}
          {venues.map((v) => (
            <FilterChip
              key={v}
              href={`/schedule?venue=${encodeURIComponent(v)}`}
              active={sp.venue === v}
            >
              {v}
            </FilterChip>
          ))}
        </div>

        {error ? (
          <ErrorState description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Schedule not published yet"
            description="Event-wise timings will appear here as the festival approaches."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-deep-purple text-xs uppercase tracking-wider text-brand-light-gold">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Round</th>
                  <th className="px-4 py-3">Venue</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(`${s.event_date}T00:00:00`).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short" },
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {s.start_time ?? TBA}
                      {s.end_time ? ` – ${s.end_time}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      {s.round ? <Badge tone="gold">{s.round}</Badge> : TBA}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.venue ?? TBA}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          s.status === "completed"
                            ? "cyan"
                            : s.status === "ongoing"
                              ? "success"
                              : s.status === "cancelled"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
        active
          ? "bg-brand-deep-purple text-brand-gold"
          : "border border-slate-200 bg-white text-slate-600 hover:border-brand-gold/50"
      }`}
    >
      {children}
    </Link>
  );
}
