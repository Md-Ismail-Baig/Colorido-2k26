export default function EventDetailLoading() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-deep-purple via-brand-purple to-brand-royal py-16 text-white">
        <div className="mx-auto max-w-[1440px] space-y-4 px-4 sm:px-6 lg:px-8">
          <div className="h-3 w-40 animate-pulse rounded bg-white/20" />
          <div className="h-12 w-2/3 animate-pulse rounded bg-white/20" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
        </div>
      </section>
      <section className="bg-brand-cream py-16">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      </section>
    </>
  );
}
