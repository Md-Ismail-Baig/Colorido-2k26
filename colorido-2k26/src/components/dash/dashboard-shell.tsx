import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import type { Profile } from "@/types/database";

interface DashboardShellProps {
  profile: Profile;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/**
 * Shared shell for Admin and Event Host dashboards.
 * Full sidebar navigation lands in Phase 7/8 — this is the Phase 2
 * authenticated base layout with working sign-out.
 */
export function DashboardShell({
  profile,
  title,
  subtitle,
  children,
}: DashboardShellProps) {
  const displayName =
    profile.full_name?.trim() || profile.username || "Staff";

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="bg-brand-deep-purple text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-light-gold">
              COLORIDO 2K26 · {profile.role === "admin" ? "Admin Console" : "Event Host Console"}
            </p>
            <h1 className="mt-0.5 font-heading text-xl font-bold sm:text-2xl">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-white/60">
                {profile.role === "admin" ? "Administrator" : "Event Host"}
              </p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-brand-gold hover:text-brand-gold"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="mb-6 text-sm text-slate-600">{subtitle}</p>
        {children}
      </main>

      <footer className="border-t border-brand-gold/20 py-6 text-center text-xs text-slate-500">
        <Link href="/" className="hover:text-brand-gold">
          ← Back to public site
        </Link>
      </footer>
    </div>
  );
}
