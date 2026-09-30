"use client";

/**
 * ROOT ERROR BOUNDARY — catches unhandled errors in any segment below the
 * root layout while keeping the site chrome intact. Users see a friendly,
 * branded recovery card with a retry button; the real error stays in the
 * server logs (dependency guide §27: never expose internals to users).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-brand-cream px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-600">
          🎪
        </div>
        <h1 className="font-heading text-2xl font-bold text-brand-deep-purple">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          An unexpected error interrupted this page. It has been logged —
          please try again.
        </p>
        {error.digest && (
          <p className="mt-2 text-[11px] text-slate-400">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-brand-deep-purple px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-gold"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-slate-300 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
          >
            Back to Home
          </a>
        </div>
      </div>
    </section>
  );
}
