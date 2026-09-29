import { cn } from "@/lib/utils";

const badgeBase =
  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider";

const tones = {
  neutral: "bg-slate-100 text-slate-600",
  gold: "bg-brand-gold/15 text-brand-burgundy border border-brand-gold/40",
  cyan: "bg-sky-50 text-sky-700 border border-sky-200",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return <span className={cn(badgeBase, tones[tone], className)}>{children}</span>;
}

import type { EventStatus, RegistrationStatus } from "@/types/database";

const eventStatusMap: Record<
  EventStatus,
  { label: string; tone: keyof typeof tones }
> = {
  draft: { label: "Draft", tone: "neutral" },
  published: { label: "Open", tone: "success" },
  closed: { label: "Closed", tone: "danger" },
  completed: { label: "Completed", tone: "cyan" },
};

const regStatusMap: Record<
  RegistrationStatus,
  { label: string; tone: keyof typeof tones }
> = {
  pending: { label: "Pending", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
  rejected: { label: "Rejected", tone: "danger" },
  checked_in: { label: "Checked In", tone: "cyan" },
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const s = eventStatusMap[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function RegistrationStatusBadge({
  status,
}: {
  status: RegistrationStatus;
}) {
  const s = regStatusMap[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
