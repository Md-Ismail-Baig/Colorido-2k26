import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getPublishedResults } from "@/lib/queries/public";

export const metadata = { title: "Results" };

const MEDALS = ["🥇", "🥈", "🥉"];

/** Prize for each finishing position (matches the prizes shown per event). */
const PRIZES: Record<number, string> = {
  1: "Trophy + ₹5,000",
  2: "Trophy + ₹3,500",
  3: "Trophy + ₹2,000",
};

export default async function ResultsPage() {
  const { data, error } = await getPublishedResults();

  return (
    <section className="bg-brand-cream py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-burgundy">
            Champions
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-brand-deep-purple sm:text-4xl">
            Fest Results
          </h1>
        </div>

        <div className="mb-10 rounded-2xl border border-brand-gold/40 bg-gradient-to-r from-brand-cream to-white px-6 py-4">
          <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-brand-burgundy">
            🎁 Prize Pool — Every Event
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-slate-700">
            <span><strong className="text-brand-deep-purple">1st:</strong> Trophy + ₹5,000</span>
            <span><strong className="text-brand-deep-purple">2nd:</strong> Trophy + ₹3,500</span>
            <span><strong className="text-brand-deep-purple">3rd:</strong> Trophy + ₹2,000</span>
          </div>
        </div>

        {error ? (
          <ErrorState description={error} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="Results not published yet"
            description="Winners will be announced here after each event concludes."
          />
        ) : (
          <div className="space-y-8">
            {data.map((group) => (
              <article
                key={group.event_id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <header className="border-b border-slate-100 bg-brand-cream-dark/60 px-6 py-4">
                  <h2 className="font-heading text-xl font-bold text-brand-deep-purple">
                    🏆 {group.event_name}
                  </h2>
                </header>
                <ol className="divide-y divide-slate-100">
                  {group.entries.map((r, i) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-4 px-6 py-4"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold font-heading text-lg font-bold text-brand-deep-purple">
                        {MEDALS[i] ?? r.position}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-700">
                          {r.team_name ?? r.participant_name ?? "—"}
                        </p>
                        {r.college && (
                          <p className="text-xs text-slate-500">{r.college}</p>
                        )}
                      </div>
                      {r.score && <Badge tone="cyan">{r.score}</Badge>}
                      {PRIZES[r.position] && (
                        <Badge tone="gold">{PRIZES[r.position]}</Badge>
                      )}
                    </li>
                  ))}
                </ol>
                <footer className="border-t border-slate-100 px-6 py-3">
                  <Link
                    href={`/events/${group.event_slug}`}
                    className="text-xs font-semibold uppercase tracking-wider text-brand-burgundy hover:text-brand-gold"
                  >
                    View event →
                  </Link>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
