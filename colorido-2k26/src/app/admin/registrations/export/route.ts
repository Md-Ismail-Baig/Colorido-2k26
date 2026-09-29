import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /admin/registrations/export — CSV download of every registration
 * (spec §29: export registration data as CSV). Admin-only. Uses the
 * service-role client because RLS blocks staff reads of participants
 * (staff authorization is enforced here, server-side).
 */
export async function GET() {
  const session = await requireRole("admin"); // redirects if not admin

  const admin = createAdminClient();

  const { data: registrations } = await admin
    .from("registrations")
    .select(
      "id, registration_number, status, mode, registered_at, event_id, participant_id",
    )
    .order("registered_at", { ascending: false });

  const { data: participants } = await admin
    .from("participants")
    .select("id, full_name, roll_number, email, mobile, college, department, year_of_study, gender");

  const { data: events } = await admin
    .from("events")
    .select("id, name, slug");

  const { data: teams } = await admin
    .from("teams")
    .select("registration_id, team_name");

  const pMap = new Map((participants ?? []).map((p) => [p.id, p]));
  const eMap = new Map((events ?? []).map((e) => [e.id, e]));
  const tMap = new Map((teams ?? []).map((t) => [t.registration_id, t.team_name]));

  const header = [
    "Registration Number",
    "Event",
    "Participant",
    "Roll Number",
    "Email",
    "Mobile",
    "College",
    "Department",
    "Year",
    "Gender",
    "Mode",
    "Team Name",
    "Status",
    "Registered At",
  ];

  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = (registrations ?? []).map((r) => {
    const p = pMap.get(r.participant_id);
    const e = eMap.get(r.event_id);
    return [
      r.registration_number,
      e?.name ?? r.event_id,
      p?.full_name ?? "",
      p?.roll_number ?? "",
      p?.email ?? "",
      p?.mobile ?? "",
      p?.college ?? "",
      p?.department ?? "",
      p?.year_of_study ?? "",
      p?.gender ?? "",
      r.mode,
      tMap.get(r.id) ?? "",
      r.status,
      r.registered_at,
    ].map(esc).join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="colorido-2k26-registrations-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
