import { requireRole } from "@/lib/auth/session";
import { ConsoleShell } from "@/components/dash/console-shell";
import { DataTable, StatusPill } from "@/components/dash/data-table";
import { ConfirmButton } from "@/components/dash/confirm-button";
import { EmptyState } from "@/components/ui/states";
import { ResultForm } from "@/components/dash/result-form";
import { getHostEventIds } from "@/lib/queries/host-events";
import { hostCreateResult, hostDeleteResult } from "../actions";
import type { ResultEntry } from "@/types/database";

export const metadata = { title: "Results · Host Console" };

export default async function HostResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { profile } = await requireRole("event_host");
  const { event: eventFilter } = await searchParams;

  const assignedIds = await getHostEventIds(profile.id);

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const [{ data: results }, { data: events }] = await Promise.all([
    assignedIds.length
      ? admin
          .from("results")
          .select("*")
          .in("event_id", assignedIds)
          .order("event_id")
          .order("position")
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
      title="Results"
      subtitle="Record results for your events. Draft entries stay private; publish when ready."
    >
      {assignedIds.length === 0 ? (
        <EmptyState
          title="No events assigned to you"
          description="Results management unlocks once the admin assigns events."
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            {(results ?? []).length === 0 ? (
              <EmptyState
                title="No results yet"
                description="Add your event results on the right when ready."
              />
            ) : (
              <DataTable
                columns={[
                  { key: "event", label: "Event" },
                  { key: "pos", label: "Pos" },
                  { key: "who", label: "Participant / Team" },
                  { key: "status", label: "Status" },
                  { key: "actions", label: "" },
                ]}
              >
                {((results ?? []) as ResultEntry[]).map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {eMap.get(r.event_id) ?? r.event_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-heading text-base font-bold text-brand-burgundy">
                      {r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : r.position}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800">
                      {r.participant_name || r.team_name || "—"}
                      <span className="block text-xs text-slate-400">
                        {r.college || ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <form action={hostDeleteResult}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="event_id" value={r.event_id} />
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
              Add Result
            </h2>
            <ResultForm
              action={hostCreateResult}
              events={events ?? []}
              submitLabel="Add Result"
            />
          </div>
        </div>
      )}
    </ConsoleShell>
  );
}
