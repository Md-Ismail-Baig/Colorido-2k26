import { createClient } from "@/lib/supabase/server";

/**
 * Event IDs assigned to the current host (spec §30).
 * Every host module filters by these IDs server-side; RLS additionally
 * enforces the same boundary at the database level.
 */
export async function getHostEventIds(hostId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_host_assignments")
    .select("event_id")
    .eq("host_id", hostId);
  return (data ?? []).map((a) => a.event_id);
}

/**
 * Guard for host pages scoped to one event: 404s (not 403 — don't leak
 * existence) when the event is not assigned to this host.
 */
export async function assertHostEvent(
  hostId: string,
  eventId: string,
): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_host_assignments")
    .select("event_id")
    .eq("host_id", hostId)
    .eq("event_id", eventId)
    .limit(1);
  if (!data?.length) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
}
