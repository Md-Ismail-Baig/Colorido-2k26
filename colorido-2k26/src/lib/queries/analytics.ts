/**
 * Phase 16 ① — Admin analytics (all numbers from live queries, never seeds).
 *
 * Data volume for a college festival is tiny, so we fetch the raw rows once
 * and aggregate in TypeScript — simpler and cheaper than many RPC round
 * trips, and every figure below is traceable to a table.
 */
import { createClient } from "@/lib/supabase/server";

export interface RegistrationRow {
  status: string;
  mode: string;
  event_id: string;
  participant_id: string;
  registered_at: string;
}

export interface AnalyticsData {
  totals: {
    registrations: number;
    confirmed: number;
    pending: number;
    cancelledOrRejected: number;
    checkedIn: number;
    uniqueParticipants: number;
    teams: number;
    teamRegistrations: number;
    individualRegistrations: number;
  };
  /** Registrations per event, tallest first. */
  perEvent: { eventId: string; name: string; category: string; count: number; checkedIn: number }[];
  /** Signups per calendar day (ISO date, chronological). */
  perDay: { date: string; count: number }[];
  /** Top colleges by unique participants. */
  perCollege: { college: string; participants: number; registrations: number }[];
  /** Published results per event (medal counts). */
  results: { eventId: string; name: string; gold: number; silver: number; bronze: number; published: number }[];
  error: string | null;
}

const EMPTY: AnalyticsData["totals"] = {
  registrations: 0, confirmed: 0, pending: 0, cancelledOrRejected: 0,
  checkedIn: 0, uniqueParticipants: 0, teams: 0, teamRegistrations: 0,
  individualRegistrations: 0,
};

export async function getAnalytics(): Promise<AnalyticsData> {
  const supabase = await createClient();

  try {
    const [regRes, eventsRes, teamsRes, resultsRes, participantsRes] =
      await Promise.all([
        supabase
          .from("registrations")
          .select("status, mode, event_id, participant_id, registered_at")
          .order("registered_at", { ascending: true })
          .limit(5000),
        supabase.from("events").select("id, name, category"),
        supabase.from("teams").select("id"),
        supabase
          .from("results")
          .select("event_id, position, status")
          .eq("status", "published")
          .limit(2000),
        supabase.from("participants").select("id, college"),
      ]);

    const err =
      regRes.error ?? eventsRes.error ?? teamsRes.error ??
      resultsRes.error ?? participantsRes.error;
    if (err) throw new Error(err.message);

    const registrations = (regRes.data ?? []) as RegistrationRow[];
    const events = new Map(
      ((eventsRes.data ?? []) as { id: string; name: string; category: string }[]).map(
        (e) => [e.id, e] as const,
      ),
    );
    const colleges = new Map(
      ((participantsRes.data ?? []) as { id: string; college: string }[]).map(
        (p) => [p.id, p.college] as const,
      ),
    );

    // ---- Totals ----------------------------------------------------------
    const totals: AnalyticsData["totals"] = { ...EMPTY };
    totals.registrations = registrations.length;
    const participantIds = new Set<string>();
    const collegeRegs = new Map<string, number>();

    for (const r of registrations) {
      participantIds.add(r.participant_id);
      if (r.status === "confirmed") totals.confirmed++;
      else if (r.status === "pending") totals.pending++;
      else if (r.status === "cancelled" || r.status === "rejected")
        totals.cancelledOrRejected++;
      else if (r.status === "checked_in") totals.checkedIn++;
      if (r.mode === "team") totals.teamRegistrations++;
      else totals.individualRegistrations++;
      const college = colleges.get(r.participant_id) ?? "Unknown";
      collegeRegs.set(college, (collegeRegs.get(college) ?? 0) + 1);
    }
    totals.uniqueParticipants = participantIds.size;
    totals.teams = (teamsRes.data ?? []).length;

    // ---- Per event -------------------------------------------------------
    const perEventMap = new Map<string, { count: number; checkedIn: number }>();
    for (const r of registrations) {
      const slot = perEventMap.get(r.event_id) ?? { count: 0, checkedIn: 0 };
      slot.count++;
      if (r.status === "checked_in") slot.checkedIn++;
      perEventMap.set(r.event_id, slot);
    }
    const perEvent = [...perEventMap.entries()]
      .map(([eventId, v]) => ({
        eventId,
        name: events.get(eventId)?.name ?? "Unknown event",
        category: events.get(eventId)?.category ?? "cultural",
        count: v.count,
        checkedIn: v.checkedIn,
      }))
      .sort((a, b) => b.count - a.count);

    // ---- Signups per day -------------------------------------------------
    const perDayMap = new Map<string, number>();
    for (const r of registrations) {
      const day = r.registered_at.slice(0, 10);
      perDayMap.set(day, (perDayMap.get(day) ?? 0) + 1);
    }
    const perDay = [...perDayMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ---- Colleges --------------------------------------------------------
    const perCollege = [...collegeRegs.entries()]
      .map(([college, regs]) => ({
        college,
        registrations: regs,
        participants: [...participantIds].filter(
          (id) => (colleges.get(id) ?? "Unknown") === college,
        ).length,
      }))
      .sort((a, b) => b.participants - a.participants || b.registrations - a.registrations)
      .slice(0, 8);

    // ---- Published results (medal table) ---------------------------------
    const medalMap = new Map<
      string,
      { gold: number; silver: number; bronze: number; published: number }
    >();
    for (const res of (resultsRes.data ?? []) as {
      event_id: string;
      position: number;
      status: string;
    }[]) {
      const slot =
        medalMap.get(res.event_id) ?? { gold: 0, silver: 0, bronze: 0, published: 0 };
      slot.published++;
      if (res.position === 1) slot.gold++;
      else if (res.position === 2) slot.silver++;
      else if (res.position === 3) slot.bronze++;
      medalMap.set(res.event_id, slot);
    }
    const results = [...medalMap.entries()]
      .map(([eventId, v]) => ({
        eventId,
        name: events.get(eventId)?.name ?? "Unknown event",
        ...v,
      }))
      .sort((a, b) => b.gold - a.gold || a.name.localeCompare(b.name));

    return { totals, perEvent, perDay, perCollege, results, error: null };
  } catch {
    return {
      totals: EMPTY, perEvent: [], perDay: [], perCollege: [], results: [],
      error: "We couldn't load analytics right now. Please try again.",
    };
  }
}
