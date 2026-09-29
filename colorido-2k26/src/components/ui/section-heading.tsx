import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: "dark" | "light";
  align?: "center" | "left";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "dark",
  align = "center",
}: SectionHeadingProps) {
  return (
    <div
      className={cn("mb-12", align === "center" ? "text-center" : "text-left")}
    >
      {eyebrow && (
        <span
          className={cn(
            "mb-3 inline-block rounded-full border px-3.5 py-1 text-xs font-semibold uppercase tracking-widest",
            tone === "dark"
              ? "border-brand-burgundy/15 bg-brand-cream-dark text-brand-burgundy"
              : "border-brand-gold/30 bg-brand-purple text-brand-gold",
          )}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          "font-heading text-3xl font-bold sm:text-4xl lg:text-5xl",
          tone === "dark" ? "text-brand-deep-purple" : "text-white",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mx-auto mt-4 max-w-2xl text-sm sm:text-base",
            tone === "dark" ? "text-slate-600" : "text-slate-300",
            align === "left" && "mx-0",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
