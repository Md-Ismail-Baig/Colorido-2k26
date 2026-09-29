import { requireRole } from "@/lib/auth/session";
import { ConsoleShell } from "@/components/dash/console-shell";
import { DataTable, StatusPill } from "@/components/dash/data-table";
import { StatusSelect } from "@/components/dash/status-select";
import { EmptyState } from "@/components/ui/states";
import { getHostEventIds } from "@/lib/queries/host-events";
import { hostSetRegistrationStatus } from "../actions";

export const metadata = { title: "Registrations · Host Console" };

export default async function HostRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { profile } = await requireRole("event_host");
  const { event: eventFilter } = await searchParams;

  const assignedIds = await getHostEventIds(profile.id);

  // A hand-crafted ?event= for an unassigned event is ignored (treated as "all").
  const scopedIds =
    eventFilter && assignedIds.includes(eventFilter)
      ? [eventFilter]
      : assignedIds;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: registrations } = scopedIds.length
    ? await admin
        .from("registrations")
        .select(
          "id, registration_number, mode, status, registered_at, event_id, participant_id",
        )
        .in("event_id", scopedIds)
        .order("registered_at", { ascending: false })
        .limit(500)
    : { data: [] };

  const rows = registrations ?? [];
  const participantIds = [...new Set(rows.map((r) => r.participant_id))];
  const { data: participants } = participantIds.length
    ? await admin
        .from("participants")
        .select("id, full_name, roll_number, college")
        .in("id", participantIds)
    : { data: [] };
  const pMap = new Map((participants ?? []).map((p) => [p.id, p] as const));

  const { data: events } = assignedIds.length
    ? await admin
        .from("events")
        .select("id, name")
        .in("id", assignedIds)
        .order("name")
    : { data: [] };
  const eMap = new Map((events ?? []).map((e) => [e.id, e.name] as const));

  return (
    <ConsoleShell
      profile={profile}
      title="Registrations"
      subtitle={`${rows.length} registration(s) across your assigned events.`}
    >
      {assignedIds.length === 0 ? (
        <EmptyState
          title="No events assigned to you"
          description="Once the admin assigns events, their registrations appear here."
        />
      ) : (
        <>
          <form className="mb-5 flex flex-wrap items-end gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Event
              <select
                name="event"
                defaultValue={eventFilter ?? ""}
                className="mt-1 block rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
              >
                <option value="">All my events</option>
                {(events ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Apply
            </button>
          </form>

          {rows.length === 0 ? (
            <EmptyState
              title="No registrations yet"
              description="Registrations for your events will appear here."
            />
          ) : (
            <DataTable
              columns={[
                { key: "reg", label: "Reg. No." },
                { key: "participant", label: "Participant" },
                { key: "event", label: "Event" },
                { key: "date", label: "Registered" },
                { key: "status", label: "Status" },
              ]}
            >
              {rows.map((r) => {
                const p = pMap.get(r.participant_id);
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-brand-burgundy">
                      {r.registration_number}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">
                        {p?.full_name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Roll {p?.roll_number ?? "—"} · {p?.college ?? ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {eMap.get(r.event_id) ?? r.event_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(r.registered_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusPill status={r.status} />
                        <StatusSelect
                          action={hostSetRegistrationStatus}
                          id={r.id}
                          value={r.status}
                          options={[
                            "pending",
                            "confirmed",
                            "checked_in",
                            "rejected",
                            "cancelled",
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          )}
        </>
      )}
    </ConsoleShell>
  );
}
