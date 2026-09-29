import Link from "next/link";
import { Badge, EventStatusBadge } from "@/components/ui/badge";
import type { Event } from "@/types/database";

/** Human labels for database enum values. */
const SUBCATEGORY_LABELS: Record<string, string> = {
  fine_arts: "Fine Arts",
  music: "Music",
  dance: "Dance",
  choreoday: "Choreoday",
  dramatics: "Dramatics",
  fashion_show: "Fashion Show",
  tekraft: "Tekraft",
  literary: "Literary",
};

/**
 * One EventCard works for EVERY event (spec §11/§44) — all content comes
 * from the `event` prop; nothing is hardcoded per event.
 */
export function EventCard({ event }: { event: Event }) {
  const isCultural = event.category === "cultural";
  const categoryLabel = isCultural
    ? "Cultural"
    : `Sports · ${event.gender === "boys" ? "Boys" : "Girls"}`;

  const dateLabel = event.event_date
    ? new Date(`${event.event_date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "To be announced";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      {/* Banner */}
      <div
        className={`relative h-44 overflow-hidden ${
          isCultural
            ? "bg-gradient-to-br from-brand-royal via-brand-purple to-brand-burgundy"
            : "bg-gradient-to-br from-brand-deep-purple via-brand-royal to-sky-900"
        }`}
      >
        {event.banner_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.banner_image}
            alt={event.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center transition-transform duration-500 group-hover:scale-[1.02]"
            aria-hidden="true"
          >
            <svg
              className={`h-16 w-16 ${
                isCultural ? "text-brand-gold/50" : "text-sky-300/50"
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              viewBox="0 0 200 200"
            >
              <circle cx="100" cy="100" r="85" strokeDasharray="2 5" />
              <circle cx="100" cy="100" r="60" />
              <path d="M100 25 L110 60 L145 55 L120 80 L135 115 L100 100 L65 115 L80 80 L55 55 L90 60 Z" />
            </svg>
          </div>
        )}
        <span className="absolute left-3 top-3">
          <Badge tone={isCultural ? "gold" : "cyan"}>{categoryLabel}</Badge>
        </span>
        {event.subcategory && (
          <span className="absolute right-3 top-3">
            <Badge tone="neutral">
              {SUBCATEGORY_LABELS[event.subcategory] ?? event.subcategory}
            </Badge>
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-heading text-lg font-bold text-brand-deep-purple group-hover:text-brand-burgundy">
          {event.name}
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
          {event.description}
        </p>

        <dl className="mt-4 space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <dt className="font-semibold uppercase tracking-wider">Date:</dt>
            <dd>{dateLabel}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="font-semibold uppercase tracking-wider">Mode:</dt>
            <dd>
              {event.registration_mode === "team"
                ? `Team (${event.team_size_min}–${event.team_size_max})`
                : "Individual"}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="font-semibold uppercase tracking-wider">Venue:</dt>
            <dd>{event.venue ?? "To be announced"}</dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <EventStatusBadge status={event.status} />
          <div className="flex items-center gap-3">
            <Link
              href={`/events/${event.slug}`}
              className="text-xs font-semibold uppercase tracking-wider text-brand-burgundy hover:text-brand-gold"
            >
              View Details →
            </Link>
            {event.status === "published" ? (
              <Link
                href={`/registration?event=${event.id}`}
                className="rounded-full bg-brand-gold px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-deep-purple transition hover:shadow-md hover:shadow-brand-gold/30"
              >
                Register
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-full bg-slate-100 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {event.status === "completed" ? "Completed" : "Closed"}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
