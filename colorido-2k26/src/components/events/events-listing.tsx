import Link from "next/link";
import { EventCard } from "@/components/events/event-card";
import { FilterDropdowns } from "@/components/events/filter-dropdowns";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { registrationDeadlineLabel } from "@/lib/utils";
import type { Event } from "@/types/database";

export interface EventsListingParams {
  category?: string;
  subcategory?: string;
  gender?: string;
  q?: string;
}

const VALID_CATEGORIES = ["all", "cultural", "sports"];
const VALID_SUBCATEGORIES = [
  "fine_arts",
  "music",
  "dance",
  "choreoday",
  "dramatics",
  "fashion_show",
  "tekraft",
  "literary",
];
const VALID_GENDERS = ["boys", "girls"];

/**
 * Shared listing UI (spec §44 — no duplicated structures across pages).
 * `basePath` controls where filter/search links point: /events,
 * /events/cultural or /events/sports.
 *
 * Filtering is URL-driven (server-rendered): the dropdown component simply
 * navigates with the same category/subcategory/gender params this component
 * has always consumed, so direct links and refreshes keep working.
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
  // Sanitize URL params — unknown values fall back to "all" instead of
  // silently filtering everything out.
  const rawCategory = params.category ?? "all";
  const category = VALID_CATEGORIES.includes(rawCategory)
    ? rawCategory
    : "all";
  const sub = VALID_SUBCATEGORIES.includes(params.subcategory ?? "")
    ? (params.subcategory ?? "")
    : "";
  const gender = VALID_GENDERS.includes(params.gender ?? "")
    ? (params.gender ?? "")
    : "";
  const q = (params.q ?? "").trim().toLowerCase();

  const effectiveCategory = lockedCategory ?? category;

  const filtered = events.filter((e) => {
    if (lockedCategory && e.category !== lockedCategory) return false;
    if (!lockedCategory && category !== "all" && e.category !== category)
      return false;
    if (
      effectiveCategory === "cultural" &&
      sub &&
      e.subcategory !== sub
    )
      return false;
    if (effectiveCategory === "sports" && gender && e.gender !== gender)
      return false;
    if (q && !`${e.name} ${e.description}`.toLowerCase().includes(q))
      return false;
    return true;
  });

  return (
    <div>
      {/* Search */}
      <form
        action={basePath}
        method="get"
        className="mx-auto mb-6 flex max-w-md gap-2"
        role="search"
      >
        {lockedCategory ? (
          <input type="hidden" name="category" value={lockedCategory} />
        ) : (
          category !== "all" && (
            <input type="hidden" name="category" value={category} />
          )
        )}
        {sub && <input type="hidden" name="subcategory" value={sub} />}
        {gender && <input type="hidden" name="gender" value={gender} />}
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

      {/* Dependent filter dropdowns — one line on desktop */}
      <FilterDropdowns
        category={category}
        subcategory={sub}
        gender={gender}
        lockedCategory={lockedCategory}
        basePath={basePath}
      />

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
              <div key={e.id} className="flex flex-col">
                {registrationDeadlineLabel(e) && (
                  <p
                    className={`mb-1.5 ml-2 text-[11px] font-semibold uppercase tracking-wider ${
                      registrationDeadlineLabel(e)!.startsWith("Closed")
                        ? "text-slate-400"
                        : "text-emerald-600"
                    }`}
                  >
                    ⏳ {registrationDeadlineLabel(e)}
                  </p>
                )}
                <EventCard event={e} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
