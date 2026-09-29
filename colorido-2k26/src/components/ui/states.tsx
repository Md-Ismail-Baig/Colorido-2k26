import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon = "✦",
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm",
        className,
      )}
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-cream-dark text-xl text-brand-gold">
        {icon}
      </div>
      <h3 className="font-heading text-lg font-bold text-slate-700">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          {description}
        </p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't complete this request right now. Please try again.",
  children,
  className,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center",
        className,
      )}
      role="alert"
    >
      <h3 className="font-heading text-lg font-bold text-red-700">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-red-600">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading content"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="h-44 animate-pulse bg-slate-200" />
          <div className="space-y-3 p-5">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
