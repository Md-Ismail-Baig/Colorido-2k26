import Link from "next/link";

/**
 * Global COLORIDO footer (spec §8).
 * No invented phone/email/address/socials — "To be announced" where unknown.
 */
export function Footer() {
  return (
    <footer className="border-t border-brand-gold/20 bg-brand-deep-purple text-slate-300">
      <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <p className="font-heading text-2xl font-extrabold tracking-wider text-white">
              COLORIDO <span className="font-normal text-brand-gold">2K26</span>
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.24em] text-brand-light-gold/80">
              Cultural &amp; Sports Fest
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              A college-level cultural and sports fest — 28 December 2026.
            </p>
          </div>

          {/* Quick links (primary navigation) */}
          <nav aria-label="Footer quick links">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-gold">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-sm">
              {[
                ["Home", "/"],
                ["Events", "/events"],
                ["Announcements", "/announcements"],
                ["Gallery", "/gallery"],
                ["Contact", "/contact"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-brand-gold">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contextual links */}
          <nav aria-label="Footer contextual links">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-gold">
              Fest
            </h3>
            <ul className="space-y-2.5 text-sm">
              {[
                ["About", "/about"],
                ["Schedule", "/schedule"],
                ["Registration", "/registration"],
                ["Results", "/results"],
                ["Sponsors", "/sponsors"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-brand-gold">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs text-slate-500">
          <p>
            © 2026 COLORIDO 2K26 · Cultural &amp; Sports Fest. All rights
            reserved.
          </p>
          <p className="mt-1">
            Address / Phone / Email:{" "}
            <span className="italic text-slate-400">To be announced</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
