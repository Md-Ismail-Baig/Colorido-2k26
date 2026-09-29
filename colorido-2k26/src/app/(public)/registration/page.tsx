import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { RegistrationWizard } from "@/components/registration/registration-wizard";
import { getPublishedEvents } from "@/lib/queries/public";

export const metadata = { title: "Registration" };

export default async function RegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const sp = await searchParams;
  const { data, error } = await getPublishedEvents();

  const events = (data ?? []).filter((e) => e.status === "published");
  const selected = sp.event ? events.find((e) => e.id === sp.event) : undefined;

  return (
    <section className="bg-brand-cream py-14">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-burgundy">
            Join the Festival
          </p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-brand-deep-purple sm:text-5xl">
            Registration
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
            Every registration requires a valid student roll number.
          </p>
        </div>

        {error ? (
          <ErrorState description={error} />
        ) : selected ? (
          <div>
            <div className="mb-6 text-center">
              <Link
                href="/registration"
                className="text-xs font-semibold uppercase tracking-wider text-brand-burgundy hover:text-brand-gold"
              >
                ← Choose a different event
              </Link>
            </div>
            <RegistrationWizard event={selected} />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title="Registration not open yet"
            description="Registrations will open here — watch the announcements page."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <Badge tone={e.category === "cultural" ? "gold" : "cyan"}>
                  {e.category === "cultural"
                    ? "Cultural"
                    : `Sports · ${e.gender}`}
                </Badge>
                <h2 className="mt-3 font-heading text-lg font-bold text-brand-deep-purple">
                  {e.name}
                </h2>
                <p className="mt-1 flex-1 text-xs text-slate-500">
                  {e.registration_mode === "team"
                    ? `Team event · ${e.team_size_min}–${e.team_size_max} members`
                    : "Individual event"}
                </p>
                <Link
                  href={`/registration?event=${e.id}`}
                  className="mt-4 block rounded-full bg-gradient-to-r from-brand-gold via-brand-light-gold to-brand-gold py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-brand-deep-purple transition hover:shadow-md hover:shadow-brand-gold/30"
                >
                  Register for this Event
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
