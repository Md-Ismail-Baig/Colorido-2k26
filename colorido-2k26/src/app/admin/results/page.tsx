import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/dash/console-shell";
import { DataTable, StatusPill } from "@/components/dash/data-table";
import { ConfirmButton } from "@/components/dash/confirm-button";
import { StatusSelect } from "@/components/dash/status-select";
import { EmptyState } from "@/components/ui/states";
import { ResultForm } from "@/components/dash/result-form";
import { createResult, deleteResult, setResultStatus } from "./actions";
import type { ResultEntry } from "@/types/database";

export const metadata = { title: "Results · Admin" };

export default async function AdminResultsPage() {
  const { profile } = await requireRole("admin");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const [{ data: results }, { data: events }] = await Promise.all([
    admin
      .from("results")
      .select("*")
      .order("event_id")
      .order("position"),
    admin.from("events").select("id, name").order("name"),
  ]);
  const eMap = new Map((events ?? []).map((e) => [e.id, e.name] as const));

  const byEvent = new Map<string, ResultEntry[]>();
  for (const r of (results ?? []) as ResultEntry[]) {
    const list = byEvent.get(r.event_id) ?? [];
    list.push(r);
    byEvent.set(r.event_id, list);
  }

  return (
    <ConsoleShell
      profile={profile}
      title="Results"
      subtitle="Only published results are visible to the public. Entries are grouped per event."
    >
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {byEvent.size === 0 ? (
            <EmptyState
              title="No results yet"
              description="Add results on the right — publish them when ready."
            />
          ) : (
            [...byEvent.entries()].map(([eventId, entries]) => (
              <div key={eventId}>
                <h2 className="mb-2 font-heading text-base font-bold text-brand-deep-purple">
                  {eMap.get(eventId) ?? eventId.slice(0, 8)}
                </h2>
                <DataTable
                  columns={[
                    { key: "pos", label: "Pos" },
                    { key: "who", label: "Participant / Team" },
                    { key: "college", label: "College" },
                    { key: "score", label: "Score" },
                    { key: "status", label: "Status" },
                    { key: "actions", label: "" },
                  ]}
                >
                  {entries.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-heading text-base font-bold text-brand-burgundy">
                        {r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : r.position}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {r.participant_name || r.team_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {r.college || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {r.score || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusPill status={r.status} />
                          <StatusSelect
                            action={setResultStatus}
                            id={r.id}
                            value={r.status}
                            options={["draft", "published"]}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <form action={deleteResult}>
                          <input type="hidden" name="id" value={r.id} />
                          <ConfirmButton label="Delete" />
                        </form>
                      </td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-3 font-heading text-lg font-bold text-brand-deep-purple">
            Add Result
          </h2>
          <ResultForm
            action={createResult}
            events={events ?? []}
            submitLabel="Add Result"
          />
        </div>
      </div>
    </ConsoleShell>
  );
}
