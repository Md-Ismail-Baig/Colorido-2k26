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

/**
 * Registration-deadline helpers. The deadline date is inclusive: registrations
 * stay open through 23:59:59 local (Asia/Kolkata) on the deadline day.
 */
export function isRegistrationOpen(event: {
  registration_deadline?: string | null;
}): boolean {
  if (!event.registration_deadline) return true;
  try {
    // End-of-day IST ≈ UTC-5:30 → "2026-12-20" closes at 18:29:59Z.
    return new Date(`${event.registration_deadline}T23:59:59+05:30`) > new Date();
  } catch {
    return true;
  }
}

/** Registrations open on the public site = published, active, deadline not passed. */
export function isEventRegisterable(event: {
  status: string;
  is_active: boolean | null;
  registration_deadline?: string | null;
}): boolean {
  return (
    event.status === "published" &&
    event.is_active !== false &&
    isRegistrationOpen(event)
  );
}

/**
 * Human summary of a registration deadline for cards and detail pages.
 * "Closes 20 Dec 2026" while open; "Closed on …" after; null when no deadline.
 */
export function registrationDeadlineLabel(event: {
  registration_deadline?: string | null;
}): string | null {
 if (!event.registration_deadline) return null;
  const d = formatDate(event.registration_deadline);
  return isRegistrationOpen(event)
    ? `Closes ${d}`
    : `Closed on ${d}`;
}
