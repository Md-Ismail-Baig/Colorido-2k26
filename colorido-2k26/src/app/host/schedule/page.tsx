import { requireRole } from "@/lib/auth/session";
import { ConsoleShell } from "@/components/dash/console-shell";
import { DataTable, StatusPill } from "@/components/dash/data-table";
import { ConfirmButton } from "@/components/dash/confirm-button";
import { EmptyState } from "@/components/ui/states";
import { ScheduleForm } from "@/components/dash/schedule-form";
import { getHostEventIds } from "@/lib/queries/host-events";
import { hostCreateScheduleSlot, hostDeleteScheduleSlot } from "../actions";
import type { ScheduleSlot } from "@/types/database";

export const metadata = { title: "Schedule · Host Console" };

export default async function HostSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { profile } = await requireRole("event_host");
  const { event: eventFilter } = await searchParams;

  const assignedIds = await getHostEventIds(profile.id);

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const [{ data: slots }, { data: events }] = await Promise.all([
    assignedIds.length
      ? admin
          .from("schedules")
          .select("*")
          .in("event_id", assignedIds)
          .order("event_date")
          .order("start_time")
      : Promise.resolve({ data: [] }),
    assignedIds.length
      ? admin
          .from("events")
          .select("id, name")
          .in("id", assignedIds)
          .order("name")
      : Promise.resolve({ data: [] }),
  ]);
  const eMap = new Map((events ?? []).map((e) => [e.id, e.name] as const));

  return (
    <ConsoleShell
      profile={profile}
      title="Schedule"
      subtitle="Manage the timeline for your assigned events. Published slots appear on the public schedule."
    >
      {assignedIds.length === 0 ? (
        <EmptyState
          title="No events assigned to you"
          description="Schedule management unlocks once the admin assigns events."
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            {(slots ?? []).length === 0 ? (
              <EmptyState
                title="No schedule slots yet"
                description="Add timing slots for your events on the right."
              />
            ) : (
              <DataTable
                columns={[
                  { key: "event", label: "Event" },
                  { key: "when", label: "When" },
                  { key: "round", label: "Round / Venue" },
                  { key: "status", label: "Status" },
                  { key: "actions", label: "" },
                ]}
              >
                {((slots ?? []) as ScheduleSlot[]).map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {eMap.get(s.event_id) ?? s.event_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(`${s.event_date}T00:00:00`).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                      {s.start_time ? ` · ${s.start_time}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {s.round || "—"}
                      <br />
                      <span className="text-slate-400">{s.venue || "Venue TBA"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={s.is_published ? s.status : "draft"} />
                    </td>
                    <td className="px-4 py-3">
                      <form action={hostDeleteScheduleSlot}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="event_id" value={s.event_id} />
                        <ConfirmButton label="Delete" />
                      </form>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-3 font-heading text-lg font-bold text-brand-deep-purple">
              Add Slot
            </h2>
            <ScheduleForm
              action={hostCreateScheduleSlot}
              events={events ?? []}
              submitLabel="Add Slot"
            />
          </div>
        </div>
      )}
    </ConsoleShell>
  );
}
