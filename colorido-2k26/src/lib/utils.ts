import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "08:00:00" → "08:00" (Postgres time strings arrive with seconds). */
export function formatTime(t: string): string {
  return t.slice(0, 5);
}

/** "2026-12-20" → "20 December 2026" (safe for plain date strings). */
export function formatDate(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
