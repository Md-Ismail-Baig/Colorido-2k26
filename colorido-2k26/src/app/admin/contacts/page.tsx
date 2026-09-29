import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/dash/console-shell";
import { DataTable, StatusPill } from "@/components/dash/data-table";
import { StatusSelect } from "@/components/dash/status-select";
import { EmptyState } from "@/components/ui/states";
import { setContactMessageStatus } from "../gallery/actions";
import type { ContactMessage } from "@/types/database";

export const metadata = { title: "Contact Messages · Admin" };

export default async function AdminContactsPage() {
  const { profile } = await requireRole("admin");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: messages } = await admin
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <ConsoleShell
      profile={profile}
      title="Contact Messages"
      subtitle={`${messages?.length ?? 0} message(s) from the public contact form.`}
    >
      {(messages ?? []).length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="Contact form submissions will appear here."
        />
      ) : (
        <DataTable
          columns={[
            { key: "from", label: "From" },
            { key: "subject", label: "Subject" },
            { key: "msg", label: "Message" },
            { key: "date", label: "Received" },
            { key: "status", label: "Status" },
          ]}
        >
          {((messages ?? []) as ContactMessage[]).map((m) => (
            <tr key={m.id} className="align-top">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{m.name}</p>
                <a href={`mailto:${m.email}`} className="text-xs text-brand-burgundy underline">
                  {m.email}
                </a>
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">{m.subject}</td>
              <td className="max-w-xs px-4 py-3 text-xs text-slate-600">
                <span className="line-clamp-3 whitespace-pre-line">{m.message}</span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {new Date(m.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <StatusPill status={m.status} />
                  <StatusSelect
                    action={setContactMessageStatus}
                    id={m.id}
                    value={m.status}
                    options={["new", "in_progress", "resolved"]}
                  />
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </ConsoleShell>
  );
}
