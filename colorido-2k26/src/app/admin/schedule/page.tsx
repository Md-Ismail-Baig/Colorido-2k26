import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/dash/console-shell";
import { DataTable, StatusPill } from "@/components/dash/data-table";
import { ConfirmButton } from "@/components/dash/confirm-button";
import { EmptyState } from "@/components/ui/states";
import { ScheduleForm } from "@/components/dash/schedule-form";
import { createScheduleSlot, deleteScheduleSlot } from "./actions";
import type { ScheduleSlot } from "@/types/database";

export const metadata = { title: "Schedule · Admin" };

export default async function AdminSchedulePage() {
  const { profile } = await requireRole("admin");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const [{ data: slots }, { data: events }] = await Promise.all([
    admin
      .from("schedules")
      .select("*")
      .order("event_date")
      .order("start_time"),
    admin.from("events").select("id, name").order("name"),
  ]);
  const eMap = new Map((events ?? []).map((e) => [e.id, e.name] as const));

  return (
    <ConsoleShell
      profile={profile}
      title="Schedule"
      subtitle={`${slots?.length ?? 0} slot(s) — published slots appear on the public schedule page.`}
    >
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {(slots ?? []).length === 0 ? (
            <EmptyState
              title="No schedule slots yet"
              description="Add slots on the right — they appear publicly once published."
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
                    <form action={deleteScheduleSlot}>
                      <input type="hidden" name="id" value={s.id} />
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
            action={createScheduleSlot}
            events={events ?? []}
            submitLabel="Add Slot"
          />
        </div>
      </div>
    </ConsoleShell>
  );
}
