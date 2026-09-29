import { requireRole } from "@/lib/auth/session";
import { ConsoleShell } from "@/components/dash/console-shell";
import { CheckInScanPanel } from "@/components/dash/check-in-scan-panel";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Check-in · Admin" };

export default async function AdminCheckInPage() {
  const { profile } = await requireRole("admin");
  const admin = createAdminClient();

  const [confirmedRes, checkedInRes] = await Promise.all([
    admin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    admin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("status", "checked_in"),
  ]);

  const confirmed = confirmedRes.count ?? 0;
  const checkedIn = checkedInRes.count ?? 0;
  const pct = confirmed + checkedIn > 0
    ? Math.round((checkedIn / (confirmed + checkedIn)) * 100)
    : 0;

  return (
    <ConsoleShell
      profile={profile}
      title="Check-in Scanner"
      subtitle="Festival-wide entry gate — scan a pass or type its code."
    >
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="font-heading text-2xl font-bold text-brand-burgundy">{confirmed}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Awaiting entry</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="font-heading text-2xl font-bold text-emerald-600">{checkedIn}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Checked in</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="font-heading text-2xl font-bold text-brand-deep-purple">{pct}%</p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Arrived</p>
        </div>
      </div>

      <CheckInScanPanel />
    </ConsoleShell>
  );
}
