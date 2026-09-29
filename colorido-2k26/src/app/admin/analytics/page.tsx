import { requireRole } from "@/lib/auth/session";
import { ConsoleShell } from "@/components/dash/console-shell";
import { getAnalytics } from "@/lib/queries/analytics";

export const metadata = { title: "Analytics · Admin" };

function Card({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        accent
          ? "border-brand-gold/40 bg-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="font-heading text-3xl font-bold text-brand-burgundy">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

/** Simple horizontal bar chart — pure CSS, no chart library. */
function BarRow({
  label,
  sub,
  count,
  max,
  suffix,
}: {
  label: string;
  sub?: string;
  count: number;
  max: number;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium text-slate-700">
          {label}
          {sub && <span className="ml-2 text-xs text-slate-400">{sub}</span>}
        </span>
        <span className="shrink-0 font-heading font-bold text-brand-deep-purple">
          {count}
          {suffix}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-brand-cream">
        <div
          className="h-full rounded-full bg-brand-burgundy"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const { profile } = await requireRole("admin");
  const data = await getAnalytics();

  const t = data.totals;
  const maxEvent = Math.max(1, ...data.perEvent.map((e) => e.count));
  const maxDay = Math.max(1, ...data.perDay.map((d) => d.count));
  const maxCollege = Math.max(1, ...data.perCollege.map((c) => c.participants));

  const day = (d: { date: string; count: number }) => (
    <BarRow
      key={d.date}
      label={new Date(`${d.date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })}
      count={d.count}
      max={maxDay}
    />
  );

  return (
    <ConsoleShell
      profile={profile}
      title="Registration Analytics"
      subtitle="Every figure is computed live from the database."
    >
      {data.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {data.error}
        </div>
      ) : (
        <>
          {/* ---- KPI cards ---- */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card label="Total Registrations" value={t.registrations} accent />
            <Card label="Confirmed" value={t.confirmed} hint="Approved entries" />
            <Card label="Checked In" value={t.checkedIn} hint="Scanned at the gate" />
            <Card
              label="Pending"
              value={t.pending}
              hint="Awaiting review"
            />
            <Card
              label="Unique Participants"
              value={t.uniqueParticipants}
              hint="One row per student"
            />
            <Card
              label="Team Entries"
              value={t.teamRegistrations}
              hint={`${t.teams} teams formed`}
            />
            <Card
              label="Individual Entries"
              value={t.individualRegistrations}
            />
            <Card
              label="Withdrawn"
              value={t.cancelledOrRejected}
              hint="Cancelled or rejected"
            />
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {/* ---- Registrations per event ---- */}
            <section>
              <h2 className="font-heading text-lg font-bold text-brand-deep-purple">
                Registrations per event
              </h2>
              {data.perEvent.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No registrations yet.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {data.perEvent.map((e) => (
                    <BarRow
                      key={e.eventId}
                      label={e.name}
                      sub={e.checkedIn > 0 ? `${e.checkedIn} checked in` : undefined}
                      count={e.count}
                      max={maxEvent}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ---- Signups per day ---- */}
            <section>
              <h2 className="font-heading text-lg font-bold text-brand-deep-purple">
                Signups per day
              </h2>
              {data.perDay.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No registrations yet.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {data.perDay.slice(-14).map(day)}
                </div>
              )}
            </section>

            {/* ---- Top colleges ---- */}
            <section>
              <h2 className="font-heading text-lg font-bold text-brand-deep-purple">
                Top colleges
              </h2>
              {data.perCollege.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No participants yet.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {data.perCollege.map((c) => (
                    <BarRow
                      key={c.college}
                      label={c.college}
                      sub={`${c.registrations} registrations`}
                      count={c.participants}
                      max={maxCollege}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ---- Medal table ---- */}
            <section>
              <h2 className="font-heading text-lg font-bold text-brand-deep-purple">
                Published results
              </h2>
              {data.results.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No published results yet.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
                        <th className="py-2 pr-3 font-semibold">Event</th>
                        <th className="px-2 py-2 font-semibold">🥇</th>
                        <th className="px-2 py-2 font-semibold">🥈</th>
                        <th className="px-2 py-2 font-semibold">🥉</th>
                        <th className="px-2 py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.results.map((r) => (
                        <tr key={r.eventId} className="border-b border-slate-100">
                          <td className="py-2 pr-3 font-medium text-slate-700">
                            {r.name}
                          </td>
                          <td className="px-2 py-2">{r.gold}</td>
                          <td className="px-2 py-2">{r.silver}</td>
                          <td className="px-2 py-2">{r.bronze}</td>
                          <td className="px-2 py-2 font-semibold text-brand-deep-purple">
                            {r.published}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </ConsoleShell>
  );
}
