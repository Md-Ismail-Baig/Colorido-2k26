import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/dash/console-shell";
import { DataTable } from "@/components/dash/data-table";
import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Participants · Admin" };

export default async function AdminParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { profile } = await requireRole("admin");
  const { q } = await searchParams;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  let query = admin
    .from("participants")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data: participants } = await query;

  return (
    <ConsoleShell
      profile={profile}
      title="Participants"
      subtitle={`${participants?.length ?? 0} participant record(s) — canonical identity rows (college + roll number).`}
    >
      <form className="mb-5 flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name…"
          className="w-64 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600"
        >
          Search
        </button>
      </form>

      {(participants ?? []).length === 0 ? (
        <EmptyState
          title="No participants yet"
          description="Participant records are created automatically on first registration."
        />
      ) : (
        <DataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "roll", label: "Roll Number" },
            { key: "college", label: "College" },
            { key: "dept", label: "Dept / Year" },
            { key: "contact", label: "Contact" },
            { key: "gender", label: "Gender" },
          ]}
        >
          {(participants ?? []).map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 font-medium text-slate-800">
                {p.full_name}
              </td>
              <td className="px-4 py-3 text-xs font-semibold text-brand-burgundy">
                {p.roll_number}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">{p.college}</td>
              <td className="px-4 py-3 text-xs text-slate-600">
                {p.department || "—"}
                {p.year_of_study ? ` · ${p.year_of_study}` : ""}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                {p.email}
                <br />
                {p.mobile}
              </td>
              <td className="px-4 py-3 text-xs capitalize text-slate-600">
                {p.gender}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </ConsoleShell>
  );
}
