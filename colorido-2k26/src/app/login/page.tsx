import Link from "next/link";
import { cookies } from "next/headers";
import { requireAnon } from "@/lib/auth/guards";
import { LoginForm } from "@/components/auth/login-form";
import { enterAsViewer } from "@/lib/auth/actions";

export const metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await requireAnon(); // signed-in staff are redirected to their dashboard
  const { next } = await searchParams;
  // Only same-site absolute paths are honored as post-entry destinations.
  const nextDestination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-deep-purple via-brand-purple to-brand-royal px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-light-gold">
            Cultural &amp; Sports Festival · 28 December 2026
          </p>
          <h1 className="mt-2 font-heading text-4xl font-black text-white">
            COLORIDO <span className="gold-gradient-text">2K26</span>
          </h1>
        </div>

        <div className="space-y-4">
          {/* PATH A — Participant / Viewer */}
          <div className="rounded-2xl border border-brand-gold/25 bg-black/30 p-6 backdrop-blur-md">
            <h2 className="font-heading text-lg font-bold text-brand-gold">
              Participant / Viewer
            </h2>
            <p className="mt-1 text-sm text-white/70">
              Browse events, schedules and announcements — no login required.
            </p>
            <form action={enterAsViewer}>
              <input type="hidden" name="next" value={nextDestination} />
              <button
                type="submit"
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-gold via-brand-light-gold to-brand-gold px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-brand-deep-purple transition hover:shadow-lg hover:shadow-brand-gold/30"
              >
                Enter Festival Site
              </button>
            </form>
            {nextDestination !== "/" && (
              <p className="mt-2 text-center text-xs text-white/50">
                You'll continue to <span className="text-white/70">{nextDestination}</span>
              </p>
            )}
          </div>

          {/* PATH B — Staff login */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <h2 className="font-heading text-lg font-bold text-white">
              Admin / Event Host
            </h2>
            <p className="mt-1 mb-4 text-sm text-white/70">
              Authorized staff sign-in only.
            </p>

            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
