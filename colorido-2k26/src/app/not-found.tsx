import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-brand-cream px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-cream-dark text-2xl">
          🔍
        </div>
        <h1 className="font-heading text-2xl font-bold text-brand-deep-purple">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          The page you&apos;re looking for doesn&apos;t exist or was moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-brand-deep-purple px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-gold"
          >
            Back to Home
          </Link>
          <Link
            href="/events"
            className="rounded-full border border-slate-300 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
          >
            Browse Events
          </Link>
        </div>
        <p className="mt-6 text-xs italic text-slate-400">
          COLORIDO 2K26 · Fest Day: 28 December 2026
        </p>
      </div>
    </section>
  );
}
