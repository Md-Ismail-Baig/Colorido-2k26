import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/dash/console-shell";
import { StatusPill } from "@/components/dash/data-table";
import { ConfirmButton } from "@/components/dash/confirm-button";
import { StatusSelect } from "@/components/dash/status-select";
import { EmptyState } from "@/components/ui/states";
import { createAnnouncement, deleteAnnouncement, setAnnouncementStatus } from "./actions";
import { AnnouncementForm } from "@/components/dash/announcement-form";
import type { Announcement } from "@/types/database";

export const metadata = { title: "Announcements · Admin" };

export default async function AdminAnnouncementsPage() {
  const { profile } = await requireRole("admin");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const [{ data: announcements }, { data: events }] = await Promise.all([
    admin
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false }),
    admin.from("events").select("id, name").order("name"),
  ]);
  const eMap = new Map((events ?? []).map((e) => [e.id, e.name] as const));

  return (
    <ConsoleShell
      profile={profile}
      title="Announcements"
      subtitle="Fest-wide and event-specific announcements. Published items are public immediately."
    >
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {(announcements ?? []).length === 0 ? (
            <EmptyState
              title="No announcements yet"
              description="Create the first announcement on the right."
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
                    {a.scope === "festival"
                      ? "Fest-wide"
                      : `Event: ${eMap.get(a.event_id ?? "") ?? "unknown"}`}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <StatusSelect
                      action={setAnnouncementStatus}
                      id={a.id}
                      value={a.status}
                      options={["draft", "published", "expired"]}
                    />
                    <form action={deleteAnnouncement}>
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmButton label="Delete" />
                    </form>
                  </div>
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
            action={createAnnouncement}
            events={events ?? []}
            submitLabel="Create"
          />
        </div>
      </div>
    </ConsoleShell>
  );
}
