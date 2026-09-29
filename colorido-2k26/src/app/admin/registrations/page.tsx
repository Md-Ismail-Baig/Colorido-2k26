import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/dash/console-shell";
import { DataTable, StatusPill } from "@/components/dash/data-table";
import { StatusSelect } from "@/components/dash/status-select";
import { EmptyState } from "@/components/ui/states";
import { setRegistrationStatus } from "./actions";

export const metadata = { title: "Registrations · Admin" };

interface Row {
  id: string;
  registration_number: string;
  mode: string;
  status: string;
  registered_at: string;
  event_id: string;
  participant_id: string;
}

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; event?: string; status?: string }>;
}) {
  const { profile } = await requireRole("admin");
  const { q, event: eventFilter, status: statusFilter } = await searchParams;

  const supabase = await createClient();

  // Admin reads staff-side data through the service-role client (RLS blocks
  // direct anon-key reads of registrations/participants; admin role was
  // verified by requireRole above).
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  let query = admin
    .from("registrations")
    .select(
      "id, registration_number, mode, status, registered_at, event_id, participant_id",
    )
    .order("registered_at", { ascending: false })
    .limit(500);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (eventFilter) query = query.eq("event_id", eventFilter);
  const { data: registrations } = await query;
  const rows = (registrations ?? []) as Row[];

  // Resolve participants + events for display.
  const participantIds = [...new Set(rows.map((r) => r.participant_id))];
  const { data: participants } = participantIds.length
    ? await admin
        .from("participants")
        .select("id, full_name, roll_number, college")
        .in("id", participantIds)
    : { data: [] };
  const pMap = new Map(
    (participants ?? []).map((p) => [p.id, p] as const),
  );

  const { data: events } = await admin
    .from("events")
    .select("id, name")
    .order("name");
  const eMap = new Map((events ?? []).map((e) => [e.id, e.name] as const));

  // Search post-fetch on resolved participant fields (name / roll / reg no).
  const needle = q?.trim().toLowerCase();
  const filtered = needle
    ? rows.filter((r) => {
        const p = pMap.get(r.participant_id);
        return (
          r.registration_number.toLowerCase().includes(needle) ||
          p?.full_name.toLowerCase().includes(needle) ||
          p?.roll_number.toLowerCase().includes(needle)
        );
      })
    : rows;

  return (
    <ConsoleShell
      profile={profile}
      title="Registrations"
      subtitle={`${filtered.length} registration(s)${rows.length >= 500 ? " (first 500)" : ""}`}
    >
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <form className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Search
            </label>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Name, roll no, CLR26-…"
              className="w-56 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Event
            </label>
            <select
              name="event"
              defaultValue={eventFilter ?? ""}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
            >
              <option value="">All events</option>
              {(events ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Status
            </label>
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="confirmed">confirmed</option>
              <option value="pending">pending</option>
              <option value="cancelled">cancelled</option>
              <option value="rejected">rejected</option>
              <option value="checked_in">checked in</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600"
          >
            Apply
          </button>
        </form>
        <a
          href="/admin/registrations/export"
          className="rounded-full bg-brand-deep-purple px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-gold"
        >
          ↓ Export CSV
        </a>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No registrations found"
          description={
            q || eventFilter || statusFilter
              ? "Try changing the filters."
              : "Registrations will appear here as participants sign up."
          }
        />
      ) : (
        <DataTable
          columns={[
            { key: "reg", label: "Reg. No." },
            { key: "participant", label: "Participant" },
            { key: "event", label: "Event" },
            { key: "mode", label: "Mode" },
            { key: "date", label: "Registered" },
            { key: "status", label: "Status" },
          ]}
        >
          {filtered.map((r) => {
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
                <td className="px-4 py-3 text-xs capitalize text-slate-600">
                  {r.mode}
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
                      action={setRegistrationStatus}
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

      <p className="mt-4 text-xs text-slate-400">
        Tip: use the filters, then export — the CSV follows the current event
        and status filters.{" "}
        <Link href="/admin/participants" className="underline">
          Participant list
        </Link>
      </p>
    </ConsoleShell>
  );
}
