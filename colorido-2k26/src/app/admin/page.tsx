import { requireRole } from "@/lib/auth/session";
import { ConsoleShell } from "@/components/dash/console-shell";
import { getDashboardStats } from "@/lib/queries/dashboard-stats";
import Link from "next/link";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminPage() {
  const { profile } = await requireRole("admin");
  const stats = await getDashboardStats();

  const cards = [
    { label: "Total Events", value: stats.totalEvents },
    { label: "Cultural Events", value: stats.culturalEvents },
    { label: "Sports Events", value: stats.sportsEvents },
    { label: "Published Events", value: stats.publishedEvents },
    { label: "Registrations", value: stats.registrations },
    { label: "Participants", value: stats.participants },
    { label: "Teams", value: stats.teams },
    { label: "Announcements", value: stats.announcements },
    { label: "Published Results", value: stats.resultsPublished },
    { label: "Host Assignments", value: stats.hostsAssigned },
  ];

  return (
    <ConsoleShell
      profile={profile}
      title="Fest Overview"
      subtitle="Live fest statistics — everything on this page comes from the database."
    >
      {stats.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {stats.error}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="font-heading text-3xl font-bold text-brand-burgundy">
                {c.value}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {c.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/events/new"
          className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-brand-gold"
        >
          <p className="font-heading text-base font-bold text-brand-deep-purple">+ New Event</p>
          <p className="mt-1 text-xs text-slate-500">Add an event to the programme</p>
        </Link>
        <Link
          href="/admin/registrations"
          className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-brand-gold"
        >
          <p className="font-heading text-base font-bold text-brand-deep-purple">Registrations</p>
          <p className="mt-1 text-xs text-slate-500">Search, filter and export CSV</p>
        </Link>
        <Link
          href="/admin/hosts"
          className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-brand-gold"
        >
          <p className="font-heading text-base font-bold text-brand-deep-purple">Event Hosts</p>
          <p className="mt-1 text-xs text-slate-500">Create hosts and assign events</p>
        </Link>
      </div>
    </ConsoleShell>
  );
}
