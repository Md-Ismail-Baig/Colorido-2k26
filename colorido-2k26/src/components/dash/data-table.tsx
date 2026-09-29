import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Reusable admin data table (spec §44). Renders columns + rows with
 * consistent styling; empty state handled by the caller via EmptyState.
 */
export function DataTable({
  columns,
  children,
  className,
}: {
  columns: { key: string; label: string; className?: string }[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500",
                  c.className,
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

const PILL_TONES: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  checked_in: "bg-cyan-50 text-cyan-700 border-cyan-200",
  scheduled: "bg-cyan-50 text-cyan-700 border-cyan-200",
  ongoing: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  new: "bg-violet-50 text-violet-700 border-violet-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  completed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  expired: "bg-slate-100 text-slate-500 border-slate-200",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        PILL_TONES[status] ?? "bg-slate-100 text-slate-600 border-slate-200",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
