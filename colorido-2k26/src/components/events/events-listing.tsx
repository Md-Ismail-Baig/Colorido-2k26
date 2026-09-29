import Link from "next/link";
import { EventCard } from "@/components/events/event-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import type { Event } from "@/types/database";

const CULTURAL_SUBS = [
  ["", "All"],
  ["fine_arts", "Fine Arts"],
  ["music", "Music"],
  ["dance", "Dance"],
  ["choreoday", "Choreoday"],
  ["dramatics", "Dramatics"],
  ["fashion_show", "Fashion Show"],
  ["tekraft", "Tekraft"],
  ["literary", "Literary"],
] as const;

export interface EventsListingParams {
  category?: string;
  subcategory?: string;
  gender?: string;
  q?: string;
}

function FilterLink({
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
          ? "bg-brand-deep-purple text-brand-gold shadow-sm"
          : "border border-slate-200 bg-white text-slate-600 hover:border-brand-gold/50 hover:text-brand-burgundy"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * Shared listing UI (spec §44 — no duplicated structures across pages).
 * `basePath` controls where filter/search links point: /events,
 * /events/cultural or /events/sports.
 */
export function EventsListing({
  events,
  error,
  params,
  basePath = "/events",
  lockedCategory,
  heading,
  subheading,
}: {
  events: Event[];
  error?: string | null;
  params: EventsListingParams;
  basePath?: string;
  lockedCategory?: "cultural" | "sports";
  heading: string;
  subheading: string;
}) {
  const category = params.category ?? "all";
  const sub = params.subcategory ?? "";
  const gender = params.gender ?? "";
  const q = (params.q ?? "").trim().toLowerCase();

  const filtered = events.filter((e) => {
    if (lockedCategory && e.category !== lockedCategory) return false;
    if (!lockedCategory && category !== "all" && e.category !== category)
      return false;
    if (e.category === "cultural" && sub && e.subcategory !== sub) return false;
    if (e.category === "sports" && gender && e.gender !== gender) return false;
    if (q && !`${e.name} ${e.description}`.toLowerCase().includes(q))
      return false;
    return true;
  });

  const withParams = (patch: Record<string, string>) => {
    const merged = {
      category: lockedCategory ? "" : category,
      subcategory: sub,
      gender,
      q: params.q ?? "",
      ...patch,
    };
    const search = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v) search.set(k, v);
    });
    const s = search.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div>
      {/* Search */}
      <form
        action={basePath}
        method="get"
        className="mx-auto mb-8 flex max-w-md gap-2"
        role="search"
      >
        {lockedCategory && <input type="hidden" name="category" value={lockedCategory} />}
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search events…"
          aria-label="Search events"
          className="w-full rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm shadow-sm focus:border-brand-gold focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-brand-deep-purple px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-gold"
        >
          Search
        </button>
      </form>

      {/* Category tabs (only on the unified page) */}
      {!lockedCategory && (
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {[
            ["all", "All"],
            ["cultural", "Cultural"],
            ["sports", "Sports"],
          ].map(([value, label]) => (
            <FilterLink
              key={value}
              href={withParams({ category: value === "all" ? "" : value, subcategory: "", gender: "" })}
              active={category === value}
            >
              {label}
            </FilterLink>
          ))}
        </div>
      )}

      {/* Cultural subcategories */}
      {(!lockedCategory || lockedCategory === "cultural") && (
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {CULTURAL_SUBS.map(([value, label]) => (
            <FilterLink
              key={value || "all-subs"}
              href={withParams({ subcategory: value })}
              active={sub === value}
            >
              {label}
            </FilterLink>
          ))}
        </div>
      )}

      {/* Sports divisions */}
      {(!lockedCategory || lockedCategory === "sports") && (
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {[
            ["", "All Divisions"],
            ["boys", "Boys"],
            ["girls", "Girls"],
          ].map(([value, label]) => (
            <FilterLink
              key={value || "all-div"}
              href={withParams({ gender: value })}
              active={gender === value}
            >
              {label}
            </FilterLink>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="mt-10">
        {error ? (
          <ErrorState description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No events found"
            description="Try changing your filters or search term."
          >
            <Link
              href={basePath}
              className="rounded-full bg-brand-deep-purple px-5 py-2 text-xs font-semibold uppercase tracking-wider text-brand-gold"
            >
              Clear Filters
            </Link>
          </EmptyState>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
