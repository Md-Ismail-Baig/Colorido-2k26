import { requireRole } from "@/lib/auth/session";
import { ConsoleShell } from "@/components/dash/console-shell";
import { CheckInScanPanel } from "@/components/dash/check-in-scan-panel";
import { EmptyState } from "@/components/ui/states";
import { getHostEventIds } from "@/lib/queries/host-events";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Check-in · Host Console" };

export default async function HostCheckInPage() {
  const { profile } = await requireRole("event_host");
  const admin = createAdminClient();
  const assignedIds = await getHostEventIds(profile.id);

  interface QueueRow {
    id: string;
    registration_number: string;
    event_id: string;
    participant_id: string;
  }
  const { data: queue } = assignedIds.length
    ? await admin
        .from("registrations")
        .select("id, registration_number, event_id, participant_id")
        .in("event_id", assignedIds)
        .eq("status", "confirmed")
        .order("registered_at", { ascending: true })
        .limit(50)
    : { data: null };
  const rows = (queue ?? []) as QueueRow[];

  const participantIds = [...new Set(rows.map((r) => r.participant_id))];
  const { data: participants } = participantIds.length
    ? await admin
        .from("participants")
        .select("id, full_name, college")
        .in("id", participantIds)
    : { data: [] };
  const pMap = new Map(
    (participants ?? []).map((p) => [p.id, p] as const),
  );

  const { data: events } = assignedIds.length
    ? await admin.from("events").select("id, name").in("id", assignedIds)
    : { data: [] };
  const eMap = new Map((events ?? []).map((e) => [e.id, e.name] as const));

  return (
    <ConsoleShell
      profile={profile}
      title="Check-in Scanner"
      subtitle="Entry for your assigned events only."
    >
      <CheckInScanPanel />

      <section className="mt-8">
        <h2 className="font-heading text-lg font-bold text-brand-deep-purple">
          Awaiting entry
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Confirmed registrations for your events — open a pass to scan or
          check in from its page.
        </p>
        {rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No confirmed registrations yet"
              description="When participants register for your events, their check-in queue appears here."
            />
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {rows.map((r) => {
              const p = pMap.get(r.participant_id);
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="font-mono text-xs text-slate-400">
                    {r.registration_number}
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-700">
                    {p?.full_name ?? "Participant"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {eMap.get(r.event_id) ?? "Event"}
                    {p?.college ? ` · ${p.college}` : ""}
                  </p>
                  <a
                    href={`/check-in/${r.id}`}
                    className="mt-2 inline-block rounded-full border border-brand-burgundy/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-burgundy hover:bg-brand-cream"
                  >
                    Open pass ↗
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </ConsoleShell>
  );
}
