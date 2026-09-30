import { EventsListing } from "@/components/events/events-listing";
import { getPublishedEvents } from "@/lib/queries/public";

export const metadata = { title: "Sports Events" };

export default async function SportsEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { data, error } = await getPublishedEvents();

  return (
    <section className="bg-brand-cream py-14">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
            Athletic Championships
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-brand-deep-purple sm:text-4xl">
            Sports Events
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
            {(data ?? []).filter((e) => e.category === "sports").length}{" "}
            championships across Boys and Girls divisions — 28 December 2026.
          </p>
        </div>

        <EventsListing
          events={data ?? []}
          error={error}
          params={{ ...sp, category: "sports" }}
          basePath="/events/sports"
          lockedCategory="sports"
          heading="Sports Events"
          subheading="All sports championships"
        />
      </div>
    </section>
  );
}
