import { createClient } from "@/lib/supabase/server";

export interface DashboardStats {
  totalEvents: number;
  culturalEvents: number;
  sportsEvents: number;
  publishedEvents: number;
  registrations: number;
  participants: number;
  teams: number;
  announcements: number;
  resultsPublished: number;
  hostsAssigned: number;
  error: string | null;
}

/**
 * Real database statistics for the Admin dashboard (spec §27).
 * All counts come from live queries — no seed/mock values.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  try {
    const [
      eventsAll,
      eventsCultural,
      eventsSports,
      eventsPublished,
      registrations,
      participants,
      teams,
      announcements,
      resultsPublished,
      assignments,
    ] = await Promise.all([
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("category", "cultural"),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("category", "sports"),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("registrations").select("id", { count: "exact", head: true }),
      supabase.from("participants").select("id", { count: "exact", head: true }),
      supabase.from("teams").select("id", { count: "exact", head: true }),
      supabase.from("announcements").select("id", { count: "exact", head: true }),
      supabase.from("results").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("event_host_assignments").select("host_id", { count: "exact", head: true }),
    ]);

    const err = (r: { error: { message: string } | null }) => r.error?.message ?? null;
    const firstError =
      err(eventsAll) ?? err(eventsCultural) ?? err(eventsSports) ??
      err(eventsPublished) ?? err(registrations) ?? err(participants) ??
      err(teams) ?? err(announcements) ?? err(resultsPublished) ?? err(assignments);

    if (firstError) throw new Error(firstError);

    return {
      totalEvents: eventsAll.count ?? 0,
      culturalEvents: eventsCultural.count ?? 0,
      sportsEvents: eventsSports.count ?? 0,
      publishedEvents: eventsPublished.count ?? 0,
      registrations: registrations.count ?? 0,
      participants: participants.count ?? 0,
      teams: teams.count ?? 0,
      announcements: announcements.count ?? 0,
      resultsPublished: resultsPublished.count ?? 0,
      hostsAssigned: assignments.count ?? 0,
      error: null,
    };
  } catch {
    return {
      totalEvents: 0, culturalEvents: 0, sportsEvents: 0, publishedEvents: 0,
      registrations: 0, participants: 0, teams: 0, announcements: 0,
      resultsPublished: 0, hostsAssigned: 0,
      error:
        "We couldn't load dashboard statistics right now. Please try again.",
    };
  }
}
