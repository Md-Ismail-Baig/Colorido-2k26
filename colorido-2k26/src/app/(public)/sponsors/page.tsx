import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getActiveSponsors } from "@/lib/queries/public";
import { supabaseUrl } from "@/lib/supabase/env";

export const metadata = { title: "Sponsors" };

const TIERS = ["title", "platinum", "gold", "silver", "associate"] as const;

export default async function SponsorsPage() {
  const { data, error } = await getActiveSponsors();

  return (
    <section className="bg-brand-cream py-14">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-burgundy">
            Our Partners
          </p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-brand-deep-purple sm:text-5xl">
            Sponsors
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
            Organizations powering COLORIDO 2K26.
          </p>
        </div>

        {error ? (
          <ErrorState description={error} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="Sponsors — To be announced"
            description="Sponsor announcements will appear here once confirmed."
          />
        ) : (
          <div className="space-y-12">
            {TIERS.filter((t) => data.some((s) => s.tier === t)).map((tier) => (
              <div key={tier}>
                <h2 className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {tier} partners
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-5">
                  {data
                    .filter((s) => s.tier === tier)
                    .map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        {s.logo_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`${supabaseUrl}/storage/v1/object/public/gallery/${s.logo_path}`}
                            alt={`${s.name} logo`}
                            className="h-14 object-contain"
                          />
                        ) : (
                          <p className="font-heading text-lg font-bold text-brand-deep-purple">
                            {s.name}
                          </p>
                        )}
                        <Badge tone="gold" className="mt-3">
                          {s.tier}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
