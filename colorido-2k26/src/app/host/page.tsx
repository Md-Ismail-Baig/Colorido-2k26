import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/dash/console-shell";
import { EmptyState } from "@/components/ui/states";
import { StatusPill } from "@/components/dash/data-table";
import { getHostEventIds } from "@/lib/queries/host-events";

export const metadata = { title: "My Events · Host Console" };

export default async function HostPage() {
  const { profile } = await requireRole("event_host");
  const eventIds = await getHostEventIds(profile.id);

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: events } = eventIds.length
    ? await admin
        .from("events")
        .select("id, name, slug, category, gender, status, event_date")
        .in("id", eventIds)
        .order("name")
    : { data: [] };

  // Registration counts per assigned event.
  const { data: regs } = eventIds.length
    ? await admin
        .from("registrations")
        .select("event_id")
        .in("event_id", eventIds)
    : { data: [] };
  const counts = new Map<string, number>();
  for (const r of regs ?? []) {
    counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1);
  }

  const hostEvents = events ?? [];

  return (
    <ConsoleShell
      profile={profile}
      title="My Events"
      subtitle="You can only see and manage events assigned to you by the fest admin — enforced server-side and by database RLS."
    >
      {eventIds.length === 0 ? (
        <EmptyState
          title="No events assigned yet"
          description="The fest admin will assign your events here. Only assigned events are accessible."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hostEvents.map((event) => (
            <div
              key={event.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-gold">
                  {event.category === "cultural"
                    ? "Cultural"
                    : `Sports · ${event.gender}`}
                </p>
                <StatusPill status={event.status} />
              </div>
              <h2 className="mt-1 font-heading text-lg font-bold text-brand-deep-purple">
                {event.name}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(`${event.event_date}T00:00:00`).toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "long", year: "numeric" },
                )}
              </p>
              <p className="mt-3 font-heading text-2xl font-bold text-brand-burgundy">
                {counts.get(event.id) ?? 0}
                <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  registrations
                </span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <Link
                  href={`/host/registrations?event=${event.id}`}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                >
                  Registrations
                </Link>
                <Link
                  href={`/host/schedule?event=${event.id}`}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                >
                  Schedule
                </Link>
                <Link
                  href={`/host/results?event=${event.id}`}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                >
                  Results
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </ConsoleShell>
  );
}
