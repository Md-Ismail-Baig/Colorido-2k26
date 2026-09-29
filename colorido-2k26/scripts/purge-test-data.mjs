// Pre-launch purge (Phase 15/16): removes clearly-identified TEST and DEMO
// registrations + participants and optionally restarts the CLR26 sequence.
//
// DRY RUN by default — it lists exactly what it will delete.
// To execute for real:  npm run purge:test-data -- --yes
//
// What it targets (and nothing else):
//   1. The documented E2E test rows (CLR26-000003 / 000006 / 000007).
//   2. Every DEMO-marked row created by `npm run seed:demo`:
//      participants whose email ends with @demo.colorido.test, the
//      registrations behind them, their teams and team members.
//
// Real festival data added via the consoles is NEVER matched.
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
const DEMO_MARKER = "@demo.colorido.test";

console.log(
  EXECUTE
    ? "=== EXECUTE MODE — rows will be deleted ==="
    : "=== DRY RUN — nothing deleted. Add --yes to execute ===",
);

// ---- 1. Collect target registrations --------------------------------------
const targets = new Map(); // regId → registration row

const { data: numbered, error: numErr } = await admin
  .from("registrations")
  .select("id, registration_number, participant_id, mode")
  .in("registration_number", TEST_NUMBERS);
if (numErr) {
  console.error("LOOKUP_FAILED", numErr.message);
  process.exit(1);
}
for (const r of numbered ?? []) targets.set(r.id, r);

// Demo participants → their registrations.
const { data: demoParticipants } = await admin
  .from("participants")
  .select("id, email")
  .like("email", `%${DEMO_MARKER}`);
const demoIds = (demoParticipants ?? []).map((p) => p.id);

let demoRegs = [];
if (demoIds.length) {
  // Page through (postgrest .in() handles large lists fine at this scale).
  const { data, error } = await admin
    .from("registrations")
    .select("id, registration_number, participant_id, mode")
    .in("participant_id", demoIds);
  if (error) {
    console.error("DEMO_LOOKUP_FAILED", error.message);
    process.exit(1);
  }
  demoRegs = data ?? [];
  for (const r of demoRegs) if (!targets.has(r.id)) targets.set(r.id, r);
}

const allRegs = [...targets.values()];
const participantIds = [...new Set(allRegs.map((r) => r.participant_id))];

if (!allRegs.length) {
  console.log("No test/demo registrations found — nothing to purge.");
  process.exit(0);
}

// ---- 2. Safety: keep participants that also have REAL registrations --------
const { data: other } = await admin
  .from("registrations")
  .select("participant_id")
  .in("participant_id", participantIds)
  .not("id", "in", `(${allRegs.map((r) => `"${r.id}"`).join(",")})`);
const blocked = new Set((other ?? []).map((r) => r.participant_id));
const deletableParticipants = participantIds.filter((id) => !blocked.has(id));

const testCount = allRegs.filter((r) => TEST_NUMBERS.includes(r.registration_number)).length;
console.log(`Registrations to delete: ${allRegs.length} (test=${testCount}, demo=${allRegs.length - testCount})`);
console.log(`  ${allRegs.map((r) => r.registration_number).join(", ")}`);
console.log(`Participants deletable:  ${deletableParticipants.length} (of ${participantIds.length})`);
if (blocked.size > 0) {
  console.log(`Participants KEPT (have other registrations): ${blocked.size}`);
}

if (!EXECUTE) {
  console.log("\nDRY RUN complete. Re-run with --yes to delete.");
  process.exit(0);
}

// ---- 3. Delete in FK-safe order --------------------------------------------
const regIds = allRegs.map((r) => r.id);
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

// ---- 4. Sequence note -------------------------------------------------------
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

const [{ count: finalRegs }, { data: latest }] = await Promise.all([
  admin.from("registrations").select("id", { count: "exact", head: true }),
  admin
    .from("registrations")
    .select("registration_number")
    .order("registration_number", { ascending: false })
    .limit(1),
]);
console.log(`\nFINAL: registrations=${finalRegs} latest=${latest?.[0]?.registration_number ?? "none"}`);
console.log("PURGE_DONE");
