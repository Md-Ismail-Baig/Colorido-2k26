"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth/actions";
import type { Profile } from "@/types/database";

interface ConsoleShellProps {
  profile: Profile;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "◈" },
  { href: "/admin/analytics", label: "Analytics", icon: "▲" },
  { href: "/admin/events", label: "Events", icon: "✦" },
  { href: "/admin/registrations", label: "Registrations", icon: "✧" },
  { href: "/admin/participants", label: "Participants", icon: "☰" },
  { href: "/admin/check-in", label: "Check-in Scanner", icon: "▣" },
  { href: "/admin/teams", label: "Teams", icon: "⚒" },
  { href: "/admin/schedule", label: "Schedule", icon: "◷" },
  { href: "/admin/announcements", label: "Announcements", icon: "📣" },
  { href: "/admin/results", label: "Results", icon: "🏆" },
  { href: "/admin/gallery", label: "Gallery", icon: "▣" },
  { href: "/admin/sponsors", label: "Sponsors", icon: "❖" },
  { href: "/admin/contacts", label: "Contact Messages", icon: "✉" },
  { href: "/admin/hosts", label: "Event Hosts", icon: "👤" },
];

const HOST_NAV: NavItem[] = [
  { href: "/host", label: "My Events", icon: "◈" },
  { href: "/host/registrations", label: "Registrations", icon: "✧" },
  { href: "/host/check-in", label: "Check-in Scanner", icon: "▣" },
  { href: "/host/schedule", label: "Schedule", icon: "◷" },
  { href: "/host/announcements", label: "Announcements", icon: "📣" },
  { href: "/host/results", label: "Results", icon: "🏆" },
];

/**
 * Shared shell for the Admin and Event Host consoles.
 * One sidebar implementation — role-aware items, active state, mobile drawer.
 */
export function ConsoleShell({
  profile,
  title,
  subtitle,
  children,
}: ConsoleShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const nav = profile.role === "admin" ? ADMIN_NAV : HOST_NAV;
  const base = profile.role === "admin" ? "/admin" : "/host";
  const displayName = profile.full_name?.trim() || profile.username || "Staff";

  const isActive = (href: string) =>
    href === base ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen bg-brand-cream">
      {/* ---- Sidebar (desktop) ---- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-brand-deep-purple text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-light-gold">
            COLORIDO 2K26
          </p>
          <p className="mt-1 font-heading text-sm font-bold">
            {profile.role === "admin" ? "Admin Console" : "Event Host Console"}
          </p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-brand-gold text-brand-deep-purple"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="w-5 text-center text-xs">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="text-xs text-white/50">
            {profile.role === "admin" ? "Administrator" : "Event Host"}
          </p>
          <form action={signOut} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-full border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-brand-gold hover:text-brand-gold"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* ---- Mobile drawer ---- */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="h-full w-72 bg-brand-deep-purple pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-light-gold">
                COLORIDO 2K26
              </p>
              <p className="mt-1 font-heading text-sm font-bold text-white">
                {profile.role === "admin" ? "Admin Console" : "Event Host Console"}
              </p>
            </div>
            <nav className="space-y-1 px-3 pb-6">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                    isActive(item.href)
                      ? "bg-brand-gold text-brand-deep-purple"
                      : "text-white/75"
                  }`}
                >
                  <span className="w-5 text-center text-xs">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <form action={signOut} className="px-3 pt-4">
                <button
                  type="submit"
                  className="w-full rounded-full border border-white/25 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
                >
                  Sign Out
                </button>
              </form>
            </nav>
          </div>
        </div>
      )}

      {/* ---- Main content ---- */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-brand-gold/20 bg-brand-deep-purple text-white">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg border border-white/25 p-2 lg:hidden"
              aria-label="Open menu"
            >
              <span className="block h-0.5 w-5 bg-white" />
              <span className="mt-1 block h-0.5 w-5 bg-white" />
              <span className="mt-1 block h-0.5 w-5 bg-white" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-heading text-lg font-bold sm:text-xl">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-xs text-white/60">{subtitle}</p>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
