import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/dash/console-shell";
import { DataTable } from "@/components/dash/data-table";
import { ConfirmButton } from "@/components/dash/confirm-button";
import { EmptyState } from "@/components/ui/states";
import { SponsorForm } from "@/components/dash/sponsor-form";
import { createSponsor, deleteSponsor, toggleSponsorActive } from "../gallery/actions";
import type { Sponsor } from "@/types/database";

export const metadata = { title: "Sponsors · Admin" };

export default async function AdminSponsorsPage() {
  const { profile } = await requireRole("admin");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: sponsors } = await admin
    .from("sponsors")
    .select("*")
    .order("display_order")
    .order("name");

  return (
    <ConsoleShell
      profile={profile}
      title="Sponsors"
      subtitle={`${sponsors?.length ?? 0} sponsor(s) — only real partners should be added here.`}
    >
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {(sponsors ?? []).length === 0 ? (
            <EmptyState
              title="No sponsors yet"
              description="Add official sponsors once confirmed. The public page shows “To be announced” until then."
            />
          ) : (
            <DataTable
              columns={[
                { key: "name", label: "Sponsor" },
                { key: "tier", label: "Tier" },
                { key: "web", label: "Website" },
                { key: "active", label: "Active" },
                { key: "actions", label: "" },
              ]}
            >
              {((sponsors ?? []) as Sponsor[]).map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {s.name}
                  </td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider text-slate-600">
                    {s.tier}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {s.website ? (
                      <a
                        href={s.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline"
                      >
                        {s.website.replace(/^https?:\/\//, "").slice(0, 30)}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleSponsorActive}>
                      <input type="hidden" name="id" value={s.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={s.is_active ? "0" : "1"}
                      />
                      <button
                        type="submit"
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                          s.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-300 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {s.is_active ? "Active" : "Inactive"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <form action={deleteSponsor}>
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmButton label="Delete" />
                    </form>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-3 font-heading text-lg font-bold text-brand-deep-purple">
            Add Sponsor
          </h2>
          <SponsorForm action={createSponsor} submitLabel="Add Sponsor" />
        </div>
      </div>
    </ConsoleShell>
  );
}
