import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConsoleShell } from "@/components/dash/console-shell";
import { DataTable } from "@/components/dash/data-table";
import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Teams · Admin" };

interface TeamRow {
  id: string;
  team_name: string;
  captain_id: string;
  created_at: string;
  // PostgREST embeds: runtime shape is a single object for many-to-one
  // (teams -> registration -> event); supabase-js types it as an array.
  registrations: {
    registration_number: string;
    events: { id: string; name: string } | { id: string; name: string }[];
  } | null;
}

/** Shape-agnostic embed unwrap: handles object-or-array from either layer. */
function unwrap<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

function embedEvent(raw: TeamRow): { id?: string; name?: string } | undefined {
  return unwrap(unwrap(raw.registrations)?.events);
}

function embedRegNumber(raw: TeamRow): string {
  return unwrap(raw.registrations)?.registration_number ?? "";
}

interface MemberRow {
  team_id: string;
  name: string;
  roll_number: string;
  role: string;
}

export default async function AdminTeamsPage() {
  const { profile } = await requireRole("admin");

  const admin = createAdminClient();

  // Teams joined through their registration to the event they belong to —
  // the grouping key for the page (one section per event).
  const { data: teams } = await admin
    .from("teams")
    .select(
      "id, team_name, captain_id, created_at, registrations(registration_number, events(id, name))",
    )
    .order("created_at", { ascending: false });

  const { data: members } = await admin
    .from("team_members")
    .select("team_id, name, roll_number, role")
    .order("role");

  const membersByTeam = new Map<string, MemberRow[]>();
  for (const m of members ?? []) {
    const list = membersByTeam.get(m.team_id) ?? [];
    list.push(m);
    membersByTeam.set(m.team_id, list);
  }

  const captainIds = ((teams ?? []) as unknown as TeamRow[]).map((t) => t.captain_id);
  const { data: captains } = captainIds.length
    ? await admin
        .from("participants")
        .select("id, full_name")
        .in("id", captainIds)
    : { data: [] };
  const cMap = new Map((captains ?? []).map((c) => [c.id, c.full_name] as const));

  // ---- Group by event -------------------------------------------------------
  const byEvent = new Map<
    string,
    { eventName: string; teams: TeamRow[] }
  >();
  for (const raw of (teams ?? []) as unknown as TeamRow[]) {
    const ev = embedEvent(raw);
    const key = ev?.id ?? "unassigned";
    const group = byEvent.get(key) ?? { eventName: ev?.name ?? "Unassigned", teams: [] };
    group.teams.push(raw);
    byEvent.set(key, group);
  }
  const groups = [...byEvent.entries()].sort((a, b) =>
    a[1].eventName.localeCompare(b[1].eventName),
  );

  const totalTeams = ((teams ?? []) as unknown as TeamRow[]).length;

  const renderTable = (eventTeams: TeamRow[]) => (
    <DataTable
      columns={[
        { key: "team", label: "Team" },
        { key: "captain", label: "Captain" },
        { key: "size", label: "Members" },
        { key: "roster", label: "Roster (roll numbers)" },
      ]}
    >
      {eventTeams.map((t) => {
        const roster = membersByTeam.get(t.id) ?? [];
        return (
          <tr key={t.id}>
            <td className="px-4 py-3 font-medium text-slate-800">
              {t.team_name}
              <p className="text-[11px] text-slate-400">
                {embedRegNumber(t)}
              </p>
            </td>
            <td className="px-4 py-3 text-xs text-slate-600">
              {cMap.get(t.captain_id) ?? "—"}
            </td>
            <td className="px-4 py-3 text-xs text-slate-600">{roster.length}</td>
            <td className="px-4 py-3">
              <ul className="space-y-0.5 text-xs text-slate-600">
                {roster.map((m, i) => (
                  <li key={i}>
                    {m.name}{" "}
                    <span className="font-semibold text-brand-burgundy">
                      ({m.roll_number})
                    </span>
                    {m.role === "captain" && (
                      <span className="ml-1 text-[10px] font-bold uppercase text-brand-gold">
                        C
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </td>
          </tr>
        );
      })}
    </DataTable>
  );

  return (
    <ConsoleShell
      profile={profile}
      title="Teams"
      subtitle={`${totalTeams} team(s) across ${groups.length} event(s) — grouped by event.`}
    >
      {totalTeams === 0 ? (
        <EmptyState
          title="No teams yet"
          description="Teams appear here when participants register for team events."
        />
      ) : (
        <div className="space-y-10">
          {groups.map(([eventId, group]) => (
            <section key={eventId}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-heading text-lg font-bold text-brand-deep-purple">
                  {group.eventName}
                </h2>
                <span className="rounded-full bg-brand-cream-dark px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-burgundy">
                  {group.teams.length} team{group.teams.length === 1 ? "" : "s"}
                </span>
              </div>
              {renderTable(group.teams)}
            </section>
          ))}
        </div>
      )}
    </ConsoleShell>
  );
}
