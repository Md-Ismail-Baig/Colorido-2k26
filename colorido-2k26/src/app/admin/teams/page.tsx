import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/dash/console-shell";
import { DataTable } from "@/components/dash/data-table";
import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Teams · Admin" };

export default async function AdminTeamsPage() {
  const { profile } = await requireRole("admin");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: teams } = await admin
    .from("teams")
    .select("id, team_name, captain_id, registration_id")
    .order("created_at", { ascending: false });

  const { data: members } = await admin
    .from("team_members")
    .select("team_id, name, roll_number, role")
    .order("role");

  const membersByTeam = new Map<string, { name: string; roll_number: string; role: string }[]>();
  for (const m of members ?? []) {
    const list = membersByTeam.get(m.team_id) ?? [];
    list.push(m);
    membersByTeam.set(m.team_id, list);
  }

  const captainIds = (teams ?? []).map((t) => t.captain_id);
  const { data: captains } = captainIds.length
    ? await admin
        .from("participants")
        .select("id, full_name")
        .in("id", captainIds)
    : { data: [] };
  const cMap = new Map((captains ?? []).map((c) => [c.id, c.full_name] as const));

  return (
    <ConsoleShell
      profile={profile}
      title="Teams"
      subtitle={`${teams?.length ?? 0} team(s) with full member rosters.`}
    >
      {(teams ?? []).length === 0 ? (
        <EmptyState
          title="No teams yet"
          description="Teams appear here when participants register for team events."
        />
      ) : (
        <DataTable
          columns={[
            { key: "team", label: "Team" },
            { key: "captain", label: "Captain" },
            { key: "size", label: "Members" },
            { key: "roster", label: "Roster (roll numbers)" },
          ]}
        >
          {(teams ?? []).map((t) => {
            const roster = membersByTeam.get(t.id) ?? [];
            return (
              <tr key={t.id}>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {t.team_name}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {cMap.get(t.captain_id) ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {roster.length}
                </td>
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
      )}
    </ConsoleShell>
  );
}
