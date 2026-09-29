// Pre-launch purge (Phase 15): removes the clearly-identified TEST
// registrations + participants and optionally restarts the CLR26 sequence.
//
// DRY RUN by default — it lists exactly what it will delete.
// To execute for real:  node --env-file=.env.local scripts/purge-test-data.mjs --yes
//
// Real festival data added via the consoles is NEVER matched; the script only
// targets the documented test rows (CLR26-000003 / 000006 / 000007 + the
// test participants behind them).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("MISSING_ENV");
  process.exit(1);
}
const EXECUTE = process.argv.includes("--yes");

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_NUMBERS = ["CLR26-000003", "CLR26-000006", "CLR26-000007"];

console.log(
  EXECUTE
    ? "=== EXECUTE MODE — rows will be deleted ==="
    : "=== DRY RUN — nothing deleted. Add --yes to execute ===",
);

// 1. Locate the test registrations + their participants.
const { data: regs, error } = await admin
  .from("registrations")
  .select("id, registration_number, participant_id, event_id, mode")
  .in("registration_number", TEST_NUMBERS);

if (error) {
  console.error("LOOKUP_FAILED", error.message);
  process.exit(1);
}
if (!regs?.length) {
  console.log("No matching test registrations found — nothing to purge.");
  process.exit(0);
}

const participantIds = [...new Set(regs.map((r) => r.participant_id))];

// Safety: a participant with registrations OTHER than the test set must not
// be deleted (would mean real data shares a participant row).
const { data: other } = await admin
  .from("registrations")
  .select("participant_id")
  .in("participant_id", participantIds)
  .not("registration_number", "in", `(${TEST_NUMBERS.join(",")})`);
const blocked = new Set((other ?? []).map((r) => r.participant_id));
const deletableParticipants = participantIds.filter((id) => !blocked.has(id));

console.log(`Registrations to delete: ${regs.map((r) => r.registration_number).join(", ")}`);
console.log(`Participants deletable:  ${deletableParticipants.length} (of ${participantIds.length})`);
if (blocked.size > 0) {
  console.log(`Participants KEPT (have other registrations): ${blocked.size}`);
}

if (!EXECUTE) {
  console.log("\nDRY RUN complete. Re-run with --yes to delete.");
  process.exit(0);
}

// 2. Delete in FK-safe order: team_members → teams → registrations → participants.
const regIds = regs.map((r) => r.id);
const { data: teams } = await admin.from("teams").select("id").in("registration_id", regIds);
const teamIds = (teams ?? []).map((t) => t.id);

if (teamIds.length) {
  const { data: tm, error: tmErr } = await admin
    .from("team_members")
    .delete()
    .in("team_id", teamIds)
    .select("id");
  console.log(`team_members deleted: ${tm?.length ?? 0}${tmErr ? " ERR:" + tmErr.message : ""}`);

  const { data: td, error: tdErr } = await admin.from("teams").delete().in("id", teamIds).select("id");
  console.log(`teams deleted: ${td?.length ?? 0}${tdErr ? " ERR:" + tdErr.message : ""}`);
}

const { data: rd, error: rdErr } = await admin
  .from("registrations")
  .delete()
  .in("id", regIds)
  .select("id");
console.log(`registrations deleted: ${rd?.length ?? 0}${rdErr ? " ERR:" + rdErr.message : ""}`);

if (deletableParticipants.length) {
  const { data: pd, error: pdErr } = await admin
    .from("participants")
    .delete()
    .in("id", deletableParticipants)
    .select("id");
  console.log(`participants deleted: ${pd?.length ?? 0}${pdErr ? " ERR:" + pdErr.message : ""}`);
}

// 3. Sequence note — restart manually if you want the festival to start at
//    CLR26-000001 (only possible once the registrations table is empty):
//      truncate registration_number_seq restart with 1;
const { count: remaining } = await admin
  .from("registrations")
  .select("id", { count: "exact", head: true });
if (remaining === 0) {
  console.log(
    "Registrations table is empty. To start fresh at CLR26-000001, run this in Supabase SQL Editor:\n" +
      "  truncate registration_number_seq restart with 1;",
  );
} else {
  console.log(`registrations remaining: ${remaining} — sequence NOT touched.`);
}

// 4. Final state.
const [{ count: finalRegs }, { data: latest }] = await Promise.all([
  admin.from("registrations").select("id", { count: "exact", head: true }),
  admin.from("registrations").select("registration_number").order("registration_number", { ascending: false }).limit(1),
]);
console.log(`\nFINAL: registrations=${finalRegs} latest=${latest?.[0]?.registration_number ?? "none"}`);
console.log("PURGE_DONE");
