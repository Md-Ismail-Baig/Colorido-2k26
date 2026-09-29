import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/dash/console-shell";
import { DataTable, StatusPill } from "@/components/dash/data-table";
import { ConfirmButton } from "@/components/dash/confirm-button";
import { StatusSelect } from "@/components/dash/status-select";
import { EmptyState } from "@/components/ui/states";
import { setEventStatus, deleteEvent } from "./actions";
import type { Event } from "@/types/database";

export const metadata = { title: "Events · Admin" };

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const { profile } = await requireRole("admin");
  const { q, error } = await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select("*")
    .order("display_order")
    .order("name");
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }
  const { data: events } = await query;
  const list = (events ?? []) as Event[];

  return (
    <ConsoleShell
      profile={profile}
      title="Events"
      subtitle={`${list.length} event(s) — create, edit, publish and manage the festival programme.`}
    >
      {error === "has-registrations" && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800"
        >
          This event has registrations and cannot be deleted. Set its status to
          “closed” instead, or remove its registrations first.
        </p>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search events…"
            className="w-64 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600"
          >
            Search
          </button>
        </form>
        <Link
          href="/admin/events/new"
          className="rounded-full bg-brand-deep-purple px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-gold"
        >
          + New Event
        </Link>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No events found"
          description={
            q ? "Try a different search." : "Create your first event to get started."
          }
        />
      ) : (
        <DataTable
          columns={[
            { key: "name", label: "Event" },
            { key: "cat", label: "Category" },
            { key: "date", label: "Date" },
            { key: "mode", label: "Mode" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions" },
          ]}
        >
          {list.map((event) => (
            <tr key={event.id} className="align-middle">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{event.name}</p>
                <p className="text-xs text-slate-400">/{event.slug}</p>
              </td>
              <td className="px-4 py-3 text-xs capitalize text-slate-600">
                {event.category}
                {event.subcategory ? ` · ${event.subcategory.replace(/_/g, " ")}` : ""}
                {event.category === "sports" ? ` · ${event.gender}` : ""}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                {new Date(`${event.event_date}T00:00:00`).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </td>
              <td className="px-4 py-3 text-xs capitalize text-slate-600">
                {event.registration_mode}
                {event.registration_mode === "team"
                  ? ` (${event.team_size_min}–${event.team_size_max})`
                  : ""}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={event.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusSelect
                    action={setEventStatus}
                    id={event.id}
                    value={event.status}
                    options={["draft", "published", "closed", "completed"]}
                  />
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                  <form action={deleteEvent}>
                    <input type="hidden" name="id" value={event.id} />
                    <ConfirmButton label="Delete" />
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </ConsoleShell>
  );
}
