"use server";

import { registrationPayloadSchema } from "@/lib/validations/registration";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RegistrationResultState {
  step?: "form" | "success";
  registrationId?: string;
  registrationNumber?: string;
  error?: string;
}

interface DbParticipant {
  id: string;
}

interface DbRegistration {
  id: string;
  registration_number: string;
}

const GENERIC_ERROR =
  "We couldn't complete this request right now. Please try again.";

/**
 * CONFIRM REGISTRATION — the real database write (spec §15–18).
 *
 * Order of checks (all server-side, never trusted from the client):
 *   1. Zod validation of the full payload
 *   2. Event exists, is published, is active, deadline not passed
 *   3. Team size within the event's configured range
 *   4. Duplicate policy:
 *        - "event":              identity by email — one registration per person per event
 *        - "college_roll_event": identity by (college, roll_number) — one per student per event
 *      The participant row is RESOLVED first (one canonical row per identity),
 *      then the exact duplicate check runs against that row. A database unique
 *      index on registrations(event_id, participant_id) is the race backstop.
 *   5. Insert registration (generated CLR26- number) → team + members for team events
 */
export async function confirmRegistration(
  _prev: RegistrationResultState,
  formData: FormData,
): Promise<RegistrationResultState> {
  // The wizard serializes its state into JSON (client-generated).
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "Invalid submission. Please start again." };
  }

  const parsed = registrationPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Please check your details and try again.",
    };
  }

  const { event_id, participant, team } = parsed.data;
  await createClient(); // ensure SSR context is initialized
  // Trusted server code performs the participant write chain. Anon RLS allows
  // inserting participants but not reading them back, so resolution and writes
  // run with the service-role client. RLS still guards all direct client access.
  const admin = createAdminClient();

  // ---- 2. Event eligibility -------------------------------------------------
  const { data: event, error: eventErr } = await supabaseEventQuery(admin, event_id);

  if (eventErr || !event) {
    return {
      error:
        "This event is not open for registration. Please check the events page.",
    };
  }

  if (
    event.registration_deadline &&
    new Date(`${event.registration_deadline}T23:59:59`) < new Date()
  ) {
    return { error: "The registration deadline for this event has passed." };
  }

  // ---- 3. Team requirements -------------------------------------------------
  const isTeamEvent = event.registration_mode === "team";
  if (isTeamEvent !== Boolean(team)) {
    return {
      error: isTeamEvent
        ? "This event requires team registration."
        : "This event does not accept team registrations.",
    };
  }

  if (team) {
    const size = team.members.length;
    if (
      (event.team_size_min && size < event.team_size_min) ||
      (event.team_size_max && size > event.team_size_max)
    ) {
      return {
        error: `This event requires a team of ${event.team_size_min}–${event.team_size_max} members (including the captain). You submitted ${size}.`,
      };
    }
  }

  // ---- 4a. Resolve the participant to ONE canonical row ---------------------
  const byEmail = event.duplicate_policy === "event";
  let participantId: string | null = null;
  let createdParticipant = false;

  const resolveQuery = admin
    .from("participants")
    .select("id")
    .order("created_at")
    .limit(1);
  const { data: existing } = byEmail
    ? await resolveQuery.eq("email", participant.email)
    : await resolveQuery
        .eq("college", participant.college)
        .eq("roll_number", participant.roll_number);

  if (existing?.length) {
    // Returning participant — reuse their canonical row.
    participantId = (existing[0] as DbParticipant).id;
  } else {
    const { data: created, error: pErr } = await admin
      .from("participants")
      .insert({
        full_name: participant.full_name,
        roll_number: participant.roll_number,
        email: participant.email,
        mobile: participant.mobile,
        college: participant.college,
        department: participant.department || null,
        year_of_study: participant.year_of_study || null,
        gender: participant.gender,
      })
      .select("id")
      .single();

    if (created) {
      participantId = (created as DbParticipant).id;
      createdParticipant = true;
    } else if (pErr?.code === "23505") {
      // Lost a create race (unique index active). Re-resolve.
      const retry = admin
        .from("participants")
        .select("id")
        .order("created_at")
        .limit(1);
      const { data: again } = byEmail
        ? await retry.eq("email", participant.email)
        : await retry
            .eq("college", participant.college)
            .eq("roll_number", participant.roll_number);
      participantId = again?.length ? (again[0] as DbParticipant).id : null;
      if (!participantId) {
        console.error(
          "[registration] participant race re-resolve failed:",
          pErr.message,
        );
        return { error: GENERIC_ERROR };
      }
    } else {
      console.error(
        "[registration] participant insert failed:",
        JSON.stringify({
          code: pErr?.code,
          message: pErr?.message,
          details: pErr?.details,
        }),
      );
      return { error: GENERIC_ERROR };
    }
  }

  // ---- 4b. Exact duplicate check on the resolved row ------------------------
  const { data: dup } = await admin
    .from("registrations")
    .select("id")
    .eq("event_id", event_id)
    .eq("participant_id", participantId)
    .limit(1);

  if (dup?.length) {
    return {
      error: byEmail
        ? "You are already registered for this event."
        : "A participant from your college with this roll number is already registered for this event.",
    };
  }

  // ---- 5. Insert chain ------------------------------------------------------
  // Registration number comes from the database sequence (CLR26-000001…).
  const { data: regNumber, error: seqErr } = await admin.rpc(
    "next_registration_number",
  );
  if (seqErr || typeof regNumber !== "string") {
    console.error("[registration] sequence rpc failed:", seqErr?.message);
    if (createdParticipant) {
      await admin.from("participants").delete().eq("id", participantId);
    }
    return { error: GENERIC_ERROR };
  }

  const { data: reg, error: rErr } = await admin
    .from("registrations")
    .insert({
      registration_number: regNumber,
      event_id,
      participant_id: participantId,
      mode: isTeamEvent ? "team" : "individual",
      status: "confirmed",
    })
    .select("id, registration_number")
    .single();

  if (rErr || !reg) {
    if (rErr?.code === "23505") {
      // Race backstop: registrations(event_id, participant_id) unique index.
      if (createdParticipant) {
        await admin.from("participants").delete().eq("id", participantId);
      }
      return {
        error: byEmail
          ? "You are already registered for this event."
          : "A participant from your college with this roll number is already registered for this event.",
      };
    }
    console.error(
      "[registration] insert failed:",
      JSON.stringify({ code: rErr?.code, message: rErr?.message }),
    );
    if (createdParticipant) {
      await admin.from("participants").delete().eq("id", participantId);
    }
    return { error: GENERIC_ERROR };
  }

  const registration = reg as DbRegistration;

  if (team) {
    // Captain = the registering participant.
    const { data: newTeam, error: tErr } = await admin
      .from("teams")
      .insert({
        registration_id: registration.id,
        team_name: team.team_name,
        captain_id: participantId,
      })
      .select("id")
      .single();

    if (tErr || !newTeam) {
      console.error("[registration] team insert failed:", tErr?.message);
      return {
        error:
          "Registration saved but team details failed. Contact support with your registration ID.",
      };
    }

    // First listed member is the captain; the rest are members.
    const rows = team.members.map((m, i) => ({
      team_id: (newTeam as { id: string }).id,
      name: m.name,
      roll_number: m.roll_number,
      email: m.email || null,
      phone: m.phone || null,
      college: m.college || participant.college,
      department: m.department || null,
      year: m.year || null,
      gender: m.gender || null,
      role: i === 0 ? "captain" : "member",
    }));

    const { error: mErr } = await admin.from("team_members").insert(rows);
    if (mErr) {
      console.error("[registration] team members insert failed:", mErr.message);
      return {
        error:
          "Registration saved but team members failed to save. Contact support with your registration ID.",
      };
    }
  }

  return {
    step: "success",
    registrationId: registration.id,
    registrationNumber: registration.registration_number,
  };
}

/**
 * Event eligibility lookup. Kept separate so the RLS-scoped client could be
 * swapped in later for user-scoped reads; the service-role client is used
 * because registration is a trusted server flow and drafts must stay hidden
 * (a draft event simply fails the status filter below).
 */
function supabaseEventQuery(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
) {
  return admin
    .from("events")
    .select(
      "id, name, status, registration_deadline, registration_mode, team_size_min, team_size_max, duplicate_policy",
    )
    .eq("id", eventId)
    .eq("status", "published")
    .eq("is_active", true)
    .single();
}
