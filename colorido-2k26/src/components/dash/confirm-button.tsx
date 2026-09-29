"use client";

import { useFormStatus } from "react-dom";

/**
 * Destructive-action submit button. First click arms it ("Click to confirm"),
 * second click submits. Resets when the pointer leaves or the form finishes.
 */
export function ConfirmButton({
  label,
  confirmLabel = "Click again to confirm",
  className,
  title,
}: {
  label: string;
  confirmLabel?: string;
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title={title}
      onClick={(e) => {
        const el = e.currentTarget;
        if (el.dataset.armed !== "1") {
          e.preventDefault();
          el.dataset.armed = "1";
          el.textContent = confirmLabel;
          el.classList.add(
            "bg-red-600",
            "text-white",
            "border-red-600",
          );
          const reset = () => {
            el.dataset.armed = "0";
            el.textContent = label;
            el.classList.remove("bg-red-600", "text-white", "border-red-600");
            el.removeEventListener("mouseleave", reset);
          };
          el.addEventListener("mouseleave", reset);
        }
      }}
      className={
        className ??
        "rounded-full border border-red-300 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? "Working…" : label}
    </button>
  );
}
