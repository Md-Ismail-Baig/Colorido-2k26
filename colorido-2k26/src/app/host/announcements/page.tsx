import { requireRole } from "@/lib/auth/session";
import { ConsoleShell } from "@/components/dash/console-shell";
import { StatusPill } from "@/components/dash/data-table";
import { ConfirmButton } from "@/components/dash/confirm-button";
import { EmptyState } from "@/components/ui/states";
import { AnnouncementForm } from "@/components/dash/announcement-form";
import { getHostEventIds } from "@/lib/queries/host-events";
import { hostCreateAnnouncement, hostDeleteAnnouncement } from "../actions";
import type { Announcement } from "@/types/database";

export const metadata = { title: "Announcements · Host Console" };

export default async function HostAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { profile } = await requireRole("event_host");
  const { event: eventFilter } = await searchParams;

  const assignedIds = await getHostEventIds(profile.id);

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const [{ data: announcements }, { data: events }] = await Promise.all([
    assignedIds.length
      ? admin
          .from("announcements")
          .select("*")
          .eq("scope", "event")
          .in("event_id", assignedIds)
          .order("created_at", { ascending: false })
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
      title="Announcements"
      subtitle="Publish announcements for your assigned events. They appear publicly when published."
    >
      {assignedIds.length === 0 ? (
        <EmptyState
          title="No events assigned to you"
          description="Announcement management unlocks once the admin assigns events."
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-3">
            {(announcements ?? []).length === 0 ? (
              <EmptyState
                title="No announcements yet"
                description="Create one for your event on the right."
              />
            ) : (
              ((announcements ?? []) as Announcement[]).map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={a.status} />
                    <span className="rounded-full bg-brand-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-burgundy">
                      {a.priority}
                    </span>
                    <span className="text-xs text-slate-400">
                      {eMap.get(a.event_id ?? "") ?? ""}
                    </span>
                    <form action={hostDeleteAnnouncement} className="ml-auto">
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="event_id" value={a.event_id ?? ""} />
                      <ConfirmButton label="Delete" />
                    </form>
                  </div>
                  <h3 className="mt-2 font-heading text-base font-bold text-slate-800">
                    {a.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {a.description}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-3 font-heading text-lg font-bold text-brand-deep-purple">
              New Announcement
            </h2>
            <AnnouncementForm
              action={hostCreateAnnouncement}
              events={events ?? []}
              submitLabel="Create"
              hostMode
            />
          </div>
        </div>
      )}
    </ConsoleShell>
  );
}
