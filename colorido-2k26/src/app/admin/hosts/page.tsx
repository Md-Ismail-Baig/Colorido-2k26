import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/dash/console-shell";
import { ConfirmButton } from "@/components/dash/confirm-button";
import { EmptyState } from "@/components/ui/states";
import { CreateHostForm } from "@/components/dash/create-host-form";
import {
  createEventHost,
  removeEventHost,
  assignEventToHost,
  unassignEventFromHost,
} from "./actions";
import type { EventHostAssignment, Profile } from "@/types/database";

export const metadata = { title: "Event Hosts · Admin" };

export default async function AdminHostsPage() {
  const { profile } = await requireRole("admin");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const [{ data: hosts }, { data: assignments }, { data: events }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("*")
        .eq("role", "event_host")
        .order("created_at"),
      admin.from("event_host_assignments").select("*"),
      admin.from("events").select("id, name").order("name"),
    ]);

  const eMap = new Map((events ?? []).map((e) => [e.id, e.name] as const));
  const byHost = new Map<string, EventHostAssignment[]>();
  for (const a of assignments ?? []) {
    const list = byHost.get(a.host_id) ?? [];
    list.push(a);
    byHost.set(a.host_id, list);
  }

  return (
    <ConsoleShell
      profile={profile}
      title="Event Hosts"
      subtitle={`${hosts?.length ?? 0} host account(s) — hosts can only access events assigned here (enforced by RLS + server checks).`}
    >
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {(hosts ?? []).length === 0 ? (
            <EmptyState
              title="No event hosts yet"
              description="Create the first host account on the right, then assign events."
            />
          ) : (
            ((hosts ?? []) as Profile[]).map((h) => {
              const assigned = byHost.get(h.id) ?? [];
              const assignedIds = new Set(assigned.map((a) => a.event_id));
              const available = (events ?? []).filter((e) => !assignedIds.has(e.id));
              return (
                <div
                  key={h.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-heading text-base font-bold text-slate-800">
                        {h.full_name || h.username || h.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-slate-400">{h.id.slice(0, 8)}…</p>
                    </div>
                    <form action={removeEventHost}>
                      <input type="hidden" name="id" value={h.id} />
                      <ConfirmButton
                        label="Remove Host"
                        confirmLabel="Really remove?"
                      />
                    </form>
                  </div>

                  <div className="mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Assigned events ({assigned.length})
                    </p>
                    {assigned.length === 0 ? (
                      <p className="mt-1 text-sm italic text-slate-400">
                        No events assigned yet.
                      </p>
                    ) : (
                      <ul className="mt-1 flex flex-wrap gap-2">
                        {assigned.map((a) => (
                          <li
                            key={a.event_id}
                            className="flex items-center gap-1 rounded-full bg-brand-cream py-1 pl-3 pr-1 text-xs font-medium text-brand-deep-purple"
                          >
                            {eMap.get(a.event_id) ?? a.event_id.slice(0, 8)}
                            <form action={unassignEventFromHost}>
                              <input type="hidden" name="host_id" value={h.id} />
                              <input type="hidden" name="event_id" value={a.event_id} />
                              <button
                                type="submit"
                                aria-label={`Unassign ${eMap.get(a.event_id) ?? "event"}`}
                                className="ml-1 rounded-full px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              >
                                ✕
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {available.length > 0 && (
                    <form
                      action={assignEventToHost}
                      className="mt-3 flex flex-wrap gap-2"
                    >
                      <input type="hidden" name="host_id" value={h.id} />
                      <select
                        name="event_id"
                        required
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Assign an event…
                        </option>
                        {available.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-full bg-brand-deep-purple px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-gold"
                      >
                        Assign
                      </button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-3 font-heading text-lg font-bold text-brand-deep-purple">
            Create Event Host
          </h2>
          <CreateHostForm action={createEventHost} />
        </div>
      </div>
    </ConsoleShell>
  );
}
