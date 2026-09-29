"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Global COLORIDO navbar (spec §7).
 * Exactly FIVE primary items (spec §5): Home, Events, Announcements, Gallery,
 * Contact. All other modules reached via contextual links/footer.
 */
const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Announcements", href: "/announcements" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 h-20 border-b border-brand-gold/20 bg-brand-deep-purple/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-brand-gold to-brand-burgundy p-0.5 shadow-lg shadow-brand-gold/20">
            <span className="flex h-full w-full items-center justify-center rounded-full bg-brand-purple">
              <svg
                className="h-5 w-5 text-brand-gold transition-transform duration-500 group-hover:rotate-45"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </span>
          </span>
          <span className="flex flex-col">
            <span className="font-heading text-xl font-extrabold tracking-wider text-white">
              COLORIDO <span className="font-normal text-brand-gold">2K26</span>
            </span>
            <span className="-mt-1 text-[10px] font-medium uppercase tracking-widest text-slate-300">
              Cultural &amp; Sports Fest
            </span>
          </span>
        </Link>

        {/* Desktop nav — exactly five items */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 lg:flex"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "border-b-2 border-brand-gold pb-1 text-brand-gold"
                  : "text-slate-200 hover:text-brand-gold",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden items-center gap-4 sm:flex">
          <Link
            href="/registration"
            className="rounded-full bg-gradient-to-r from-brand-gold via-brand-light-gold to-brand-gold px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-deep-purple transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-brand-gold/30 active:scale-95"
          >
            Register Now
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-slate-700 p-2 text-slate-200 hover:text-white focus-visible:outline-brand-gold lg:hidden"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-b border-brand-gold/20 bg-brand-purple/95 px-6 py-4 lg:hidden">
          <nav aria-label="Mobile navigation" className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2.5 text-sm font-medium",
                  isActive(item.href)
                    ? "bg-white/10 text-brand-gold"
                    : "text-slate-200 hover:bg-white/10 hover:text-brand-gold",
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-slate-700 pt-3">
              <Link
                href="/registration"
                onClick={() => setOpen(false)}
                className="block w-full rounded-full bg-brand-gold py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-brand-deep-purple"
              >
                Register Now
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
