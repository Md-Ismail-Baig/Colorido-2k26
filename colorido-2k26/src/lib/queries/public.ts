import { createClient } from "@/lib/supabase/server";
import type {
  Announcement,
  Event,
  GalleryItem,
  ScheduleSlot,
  Sponsor,
} from "@/types/database";

export type QueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

/**
 * Public queries — always scoped to published/active rows (RLS also enforces
 * this server-side). Every query returns a safe error string instead of
 * throwing, so pages can render proper error states (spec §40).
 */

export async function getPublishedEvents(): Promise<QueryResult<Event[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .eq("is_active", true)
    .order("display_order");
  return error
    ? { data: null, error: "We couldn't load events right now." }
    : { data: (data ?? []) as Event[], error: null };
}

export async function getPublishedAnnouncements(
  limit?: number,
): Promise<QueryResult<Announcement[]>> {
  const supabase = await createClient();
  let query = supabase
    .from("announcements")
    .select("*")
    .eq("status", "published")
    .order("priority", { ascending: true })
    .order("published_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  return error
    ? { data: null, error: "We couldn't load announcements right now." }
    : { data: (data ?? []) as Announcement[], error: null };
}

export async function getPublishedGallery(
  limit?: number,
): Promise<QueryResult<GalleryItem[]>> {
  const supabase = await createClient();
  let query = supabase
    .from("gallery")
    .select("*")
    .eq("is_published", true)
    .order("display_order")
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  return error
    ? { data: null, error: "We couldn't load the gallery right now." }
    : { data: (data ?? []) as GalleryItem[], error: null };
}

export async function getActiveSponsors(): Promise<QueryResult<Sponsor[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  return error
    ? { data: null, error: "We couldn't load sponsors right now." }
    : { data: (data ?? []) as Sponsor[], error: null };
}

export async function getPublishedSchedule(): Promise<
  QueryResult<ScheduleSlot[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .eq("is_published", true)
    .order("event_date")
    .order("start_time");
  return error
    ? { data: null, error: "We couldn't load the schedule right now." }
    : { data: (data ?? []) as ScheduleSlot[], error: null };
}

/** Public results grouped per event (published rows only). */
export async function getPublishedResults(): Promise<
  QueryResult<
    { event_id: string; event_name: string; event_slug: string; entries: {
      id: string;
      position: number;
      participant_name: string | null;
      team_name: string | null;
      college: string | null;
      score: string | null;
      remarks: string | null;
    }[] }[]
  >
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("results")
    .select(
      "id, event_id, position, participant_name, team_name, college, score, remarks, events(name, slug)",
    )
    .eq("status", "published")
    .order("position");

  if (error) return { data: null, error: "We couldn't load results right now." };

  type Row = {
    id: string;
    event_id: string;
    position: number;
    participant_name: string | null;
    team_name: string | null;
    college: string | null;
    score: string | null;
    remarks: string | null;
    events: { name: string; slug: string } | { name: string; slug: string }[];
  };

  const grouped = new Map<
    string,
    { event_id: string; event_name: string; event_slug: string; entries: {
      id: string;
      position: number;
      participant_name: string | null;
      team_name: string | null;
      college: string | null;
      score: string | null;
      remarks: string | null;
    }[] }
  >();

  for (const raw of (data ?? []) as unknown as Row[]) {
    const ev = Array.isArray(raw.events) ? raw.events[0] : raw.events;
    if (!ev) continue;
    const key = raw.event_id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        event_id: key,
        event_name: ev.name,
        event_slug: ev.slug,
        entries: [],
      });
    }
    grouped.get(key)!.entries.push({
      id: raw.id,
      position: raw.position,
      participant_name: raw.participant_name,
      team_name: raw.team_name,
      college: raw.college,
      score: raw.score,
      remarks: raw.remarks,
    });
  }

  return { data: [...grouped.values()], error: null };
}
