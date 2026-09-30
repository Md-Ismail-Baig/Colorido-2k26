"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dependent filter dropdowns for the events listing (spec §44).
 *
 * Three selects on one horizontal line — Category drives the other two:
 *   All      → subcategory + division disabled (all events shown)
 *   Cultural → subcategory enabled, division disabled
 *   Sports   → subcategory disabled, division enabled
 *
 * URL-driven: every change navigates with the EXISTING query params
 * (category / subcategory / gender) so direct links, refresh and
 * shareable URLs keep working. Disabled dropdowns stay visible with an
 * inactive appearance and a title explaining why.
 *
 * `lockedCategory` is used by /events/cultural and /events/sports, where
 * the category is fixed by the page itself.
 */

const CATEGORY_OPTIONS = [
  ["all", "All"],
  ["cultural", "Cultural"],
  ["sports", "Sports"],
] as const;

const SUBCATEGORY_OPTIONS = [
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

const DIVISION_OPTIONS = [
  ["", "All Divisions"],
  ["boys", "Boys"],
  ["girls", "Girls"],
] as const;

const selectBase =
  "peer h-11 w-full appearance-none rounded-full border pl-5 pr-10 text-xs font-semibold uppercase tracking-wider shadow-sm transition focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold";
const selectEnabled =
  "border-slate-300 bg-white text-brand-deep-purple hover:border-brand-gold/60 cursor-pointer";
const selectDisabled =
  "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed shadow-none";

function DropdownShell({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      {children}
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2",
          disabled ? "text-slate-300" : "text-brand-burgundy",
        )}
      />
    </label>
  );
}

export function FilterDropdowns({
  category,
  subcategory,
  gender,
  lockedCategory,
  basePath,
}: {
  category: string; // "all" | "cultural" | "sports"
  subcategory: string;
  gender: string;
  lockedCategory?: "cultural" | "sports";
  basePath: string;
}) {
  const router = useRouter();

  const effectiveCategory = lockedCategory ?? category;
  const subDisabled = effectiveCategory !== "cultural";
  const divDisabled = effectiveCategory !== "sports";

  /**
   * Navigate with the EXISTING params (category/subcategory/gender).
   * When the category itself changes, both dependents reset to their
   * defaults — incompatible selections can never remain in the URL.
   */
  const navigate = (patch: {
    category?: string;
    subcategory?: string;
    gender?: string;
  }) => {
    const cat = patch.category ?? effectiveCategory;
    // The new category resets both dependents (patch omits them → fallback
    // props are "" on incompatible pages); a dependent change uses its own
    // freshly selected value.
    const sub = cat === "cultural" ? (patch.subcategory ?? subcategory) : "";
    const div = cat === "sports" ? (patch.gender ?? gender) : "";

    // Preserve an active search term across filter changes.
    const q = new URLSearchParams(window.location.search).get("q") ?? "";

    const params = new URLSearchParams();
    // Unified page emits category explicitly (incl. ?category=all);
    // locked pages keep their category-free URL convention.
    if (!lockedCategory && cat) params.set("category", cat);
    if (sub) params.set("subcategory", sub);
    if (div) params.set("gender", div);
    if (q) params.set("q", q);
    const s = params.toString();
    router.push(s ? `${basePath}?${s}` : basePath, { scroll: false });
  };

  return (
    <div
      role="group"
      aria-label="Filter events"
      className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
    >
      {/* 1 · Category */}
      <DropdownShell label="Category" disabled={Boolean(lockedCategory)}>
        <select
          aria-label="Category"
          value={effectiveCategory}
          disabled={Boolean(lockedCategory)}
          onChange={(e) => navigate({ category: e.target.value })}
          className={cn(
            selectBase,
            lockedCategory ? selectDisabled : selectEnabled,
          )}
        >
          {lockedCategory ? (
            <option value={lockedCategory}>
              {lockedCategory === "cultural" ? "Cultural" : "Sports"}
            </option>
          ) : (
            CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))
          )}
        </select>
      </DropdownShell>

      {/* 2 · Cultural subcategory */}
      <DropdownShell
        label="Cultural subcategory"
        disabled={subDisabled}
      >
        <select
          aria-label="Cultural subcategory"
          value={subDisabled ? "" : subcategory}
          disabled={subDisabled}
          onChange={(e) => navigate({ subcategory: e.target.value })}
          title={
            subDisabled
              ? "Available when Category is Cultural"
              : undefined
          }
          className={cn(selectBase, subDisabled ? selectDisabled : selectEnabled)}
        >
          {SUBCATEGORY_OPTIONS.map(([value, label]) => (
            <option key={value || "all-subs"} value={value}>
              {label}
            </option>
          ))}
        </select>
      </DropdownShell>

      {/* 3 · Division / gender */}
      <DropdownShell label="Division" disabled={divDisabled}>
        <select
          aria-label="Division"
          value={divDisabled ? "" : gender}
          disabled={divDisabled}
          onChange={(e) => navigate({ gender: e.target.value })}
          title={divDisabled ? "Available when Category is Sports" : undefined}
          className={cn(selectBase, divDisabled ? selectDisabled : selectEnabled)}
        >
          {DIVISION_OPTIONS.map(([value, label]) => (
            <option key={value || "all-div"} value={value}>
              {label}
            </option>
          ))}
        </select>
      </DropdownShell>
    </div>
  );
}
