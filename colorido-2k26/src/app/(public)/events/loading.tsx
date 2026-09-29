import { LoadingSkeleton } from "@/components/ui/states";

export default function EventsLoading() {
  return (
    <section className="bg-brand-cream py-14">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-md space-y-3 text-center">
          <div className="mx-auto h-3 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mx-auto h-10 w-64 animate-pulse rounded bg-slate-200" />
        </div>
        <LoadingSkeleton count={6} />
      </div>
    </section>
  );
}
