import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getPublishedAnnouncements } from "@/lib/queries/public";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const { data, error } = await getPublishedAnnouncements();

  return (
    <section className="bg-brand-cream py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-burgundy">
            Stay Informed
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-brand-deep-purple sm:text-4xl">
            Announcements
          </h1>
        </div>

        {error ? (
          <ErrorState description={error} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No announcements available"
            description="Check back closer to the fest for updates."
          />
        ) : (
          <div className="space-y-5">
            {data.map((a) => (
              <article
                key={a.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    tone={
                      a.priority === "critical"
                        ? "danger"
                        : a.priority === "high"
                          ? "warning"
                          : "gold"
                    }
                  >
                    {a.priority} priority
                  </Badge>
                  <Badge tone="neutral">
                    {a.scope === "event" ? "Event update" : "Fest-wide"}
                  </Badge>
                  {a.scope === "event" && a.event_name && (
                    <Link
                      href={`/events/${a.event_slug}`}
                      className="text-xs font-semibold text-brand-burgundy hover:text-brand-gold"
                    >
                      {a.event_name}
                    </Link>
                  )}
                  <time className="text-xs text-slate-400">
                    {a.published_at
                      ? new Date(a.published_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : ""}
                  </time>
                </div>
                <h2 className="mt-3 font-heading text-xl font-bold text-brand-deep-purple">
                  {a.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {a.description}
                </p>
                {a.scope === "event" && a.event_slug && (
                  <Link
                    href={`/events/${a.event_slug}`}
                    className="mt-3 inline-block text-xs font-semibold uppercase tracking-wider text-brand-burgundy hover:text-brand-gold"
                  >
                    View event →
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
