import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getPublishedGallery } from "@/lib/queries/public";
import { supabaseUrl } from "@/lib/supabase/env";

export const metadata = { title: "Gallery" };

const CATEGORIES = [
  ["all", "All"],
  ["cultural", "Cultural"],
  ["sports", "Sports"],
  ["behind_the_scenes", "Behind the Scenes"],
  ["previous_editions", "Previous Editions"],
] as const;

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const active = sp.category ?? "all";
  const { data, error } = await getPublishedGallery();

  const items = (data ?? []).filter(
    (g) => active === "all" || g.category === active,
  );

  return (
    <section className="bg-brand-cream py-14">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-burgundy">
            Media Showcase
          </p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-brand-deep-purple sm:text-5xl">
            Gallery
          </h1>
        </div>

        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map(([value, label]) => (
            <Link
              key={value}
              href={value === "all" ? "/gallery" : `/gallery?category=${value}`}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                active === value
                  ? "bg-brand-deep-purple text-brand-gold"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-brand-gold/50"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {error ? (
          <ErrorState description={error} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No photos available"
            description="Festival photography will appear here once uploaded."
          />
        ) : (
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
            {items.map((g) => (
              <figure
                key={g.id}
                className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${supabaseUrl}/storage/v1/object/public/gallery/${g.storage_path}`}
                  alt={g.title ?? "Gallery image"}
                  className="w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                  loading="lazy"
                />
                {g.title && (
                  <figcaption className="flex items-center justify-between gap-2 p-3 text-xs text-slate-600">
                    <span className="font-medium">{g.title}</span>
                    <Badge tone="neutral">{g.category}</Badge>
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
