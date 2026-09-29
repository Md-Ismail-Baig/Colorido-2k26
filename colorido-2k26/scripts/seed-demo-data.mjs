/**
 * Phase 16 demo data — seed clearly-marked FAKE registrations for every event.
 *
 * Adds, per published event:
 *   - individual events → 2 demo participants (covers "2 for solo event")
 *   - team events       → 2 demo teams with members (covers "2 for group event")
 *
 * Everything demo is marked: participant emails end with
 * `@demo.colorido.test` and rolls start with `DEM-`, teams are named with a
 * "DEMO" prefix — so `npm run purge:test-data` can find and remove them
 * before production.
 *
 * Idempotent: re-running tops up only what is missing (the canonical
 * participant resolution and the (event, participant) uniqueness are the
 * same invariants the app itself enforces).
 *
 *   npm run seed:demo          (dry-run: shows the plan, writes nothing)
 *   npm run seed:demo -- --yes (writes)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

const APPLY = process.argv.includes("--yes");
const MARKER = "@demo.colorido.test";

if (!existsSync(".env.local")) {
  console.error("✗ .env.local not found — run from colorido-2k26/");
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("✗ SUPABASE_SERVICE_ROLE_KEY missing in .env.local");
  process.exit(1);
}
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ------------------------------------------------------------ demo people ---
// 32 clearly-fake identities. Gender matches the event's gender division.
const NAMES = [
  ["Aarav Menon", "male"], ["Diya Suresh", "female"], ["Rohan Iyer", "male"],
  ["Ishita Rao", "female"], ["Karthik Nair", "male"], ["Meghna Pillai", "female"],
  ["Aditya Varma", "male"], ["Sneha Krishnan", "female"], ["Vikram Reddy", "male"],
  ["Ananya Menon", "female"], ["Siddharth Ghosh", "male"], ["Priya Venkatesh", "female"],
  ["Arjun Deshpande", "male"], ["Keerthi Balan", "female"], ["Nikhil Chandra", "male"],
  ["Divya Raghavan", "female"], ["Rahul Sebastian", "male"], ["Anjali Kurian", "female"],
  ["Manoj Thomas", "male"], ["Lakshmi Warrier", "female"], ["Farhan Ahmed", "male"],
  ["Tanvi Kulkarni", "female"], ["Joseph Mathew", "male"], ["Nithya Raman", "female"],
  ["Gokul Prasad", "male"], ["Shreya Bose", "female"], ["Arun Karthik", "male"],
  ["Meera Jacob", "female"], ["Dev Patel", "male"], ["Riya Sharma", "female"],
  ["Yusuf Khan", "male"], ["Sara Thomas", "female"],
];

const COLLEGES = [
  "NSS College of Engineering",
  "Government Engineering College, Sreekrishnapuram",
  "Govt. Victoria College, Palakkad",
  "Mercy College, Palakkad",
];

const DEPTS = ["CSE", "ECE", "EEE", "ME", "CE", "IT", "MCA"];
const YEARS = ["I", "II", "III", "IV"];
const TEAM_NAMES = [
  "DEMO Rhythm Rebels", "DEMO Nadaswaram Ninjas", "DEMO Beat Bazaar",
  "DEMO Thunder Feet", "DEMO Stage Storm", "DEMO Chroma Crew",
  "DEMO Quantum Quills", "DEMO Iron Eagles", "DEMO Spike Squad",
  "DEMO Net Ninjas", "DEMO Court Kings", "DEMO Ring Rulers",
  "DEMO Shuttle Stars", "DEMO Ace Alliance", "DEMO Rally Rockets",
  "DEMO Smash Syndicate",
];

let nameIdx = 0;
const nextIdentity = (wantGender) => {
  // Find the next unused name matching the requested gender (best effort).
  for (let tries = 0; tries < NAMES.length; tries++) {
    const [n, g] = NAMES[nameIdx % NAMES.length];
    nameIdx++;
    if (g === wantGender || wantGender === "open") return { name: n, gender: g };
  }
  const [n, g] = NAMES[nameIdx++ % NAMES.length];
  return { name: n, gender: g };
};

const slugifyEmail = (name) =>
  name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");

// --------------------------------------------------------------- helpers ----
const pick = (arr, i) => arr[i % arr.length];

function fakeParticipant(idx, wantGender, college) {
  const { name, gender } = nextIdentity(wantGender);
  const roll = `DEM${String(2100 + idx).padStart(4, "0")}`;
  return {
    full_name: name,
    roll_number: roll,
    email: `${slugifyEmail(name)}.${roll.toLowerCase()}${MARKER}`,
    mobile: `+9198${String(40000000 + idx * 137).slice(0, 8)}`,
    college,
    department: pick(DEPTS, idx),
    year_of_study: pick(YEARS, idx),
    gender,
  };
}

/** Resolve-or-create the canonical participant row (same identity rules as
 *  the app: email for "event" policy, college+roll otherwise). */
async function resolveParticipant(p) {
  const { data: existing } = await admin
    .from("participants")
    .select("id")
    .eq("email", p.email)
    .limit(1);
  if (existing?.length) return existing[0].id;

  const { data: created, error } = await admin
    .from("participants")
    .insert(p)
    .select("id")
    .single();
  if (created) return created.id;
  if (error) throw new Error(`participant insert failed: ${error.message}`);
}

/** Monotonic registration number straight from the DB sequence. */
async function nextRegNumber() {
  const { data, error } = await admin.rpc("next_registration_number");
  if (error || typeof data !== "string") {
    throw new Error(`sequence rpc failed: ${error?.message ?? "bad type"}`);
  }
  return data;
}

// ------------------------------------------------------------------ main ----
const { data: events, error: evErr } = await admin
  .from("events")
  .select("id, name, slug, registration_mode, team_size_min, team_size_max, gender, status")
  .eq("is_active", true)
  .order("display_order");
if (evErr) {
  console.error("✗ events query failed:", evErr.message);
  process.exit(1);
}

const plan = [];
let personCounter = 0;

for (const ev of events) {
  const { data: regs } = await admin
    .from("registrations")
    .select("id, status, participant_id, mode")
    .eq("event_id", ev.id);

  const isTeam = ev.registration_mode === "team";

  // How many demo REGISTRATIONS exist already for this event?
  const { data: demoRegs } = await admin
    .from("registrations")
    .select("id, participant_id")
    .eq("event_id", ev.id);

  let demoCount = 0;
  if (demoRegs?.length) {
    const ids = [...new Set(demoRegs.map((r) => r.participant_id))];
    const { data: parts } = await admin
      .from("participants")
      .select("id, email")
      .in("id", ids);
    demoCount = (parts ?? []).filter((p) => p.email.endsWith(MARKER)).length;
  }

  const target = 2;
  const toCreate = Math.max(0, target - demoCount);
  plan.push({
    ev,
    isTeam,
    toCreate,
    existing: demoCount,
    statusHint: (regs ?? []).map((r) => r.status),
  });
}

console.log(`\nDemo seeding plan (${APPLY ? "APPLY" : "dry run"}):\n`);
for (const p of plan) {
  console.log(
    `  ${p.isTeam ? "team  " : "single"} ${p.ev.slug.padEnd(24)} demo=${p.existing} → create ${p.toCreate}`,
  );
}

if (!APPLY) {
  console.log(
    "\nDry run only. Re-run with `npm run seed:demo -- --yes` to write.",
  );
  process.exit(0);
}

console.log("\nWriting…");
let createdRegs = 0;
let createdTeams = 0;
const errors = [];

for (const { ev, isTeam, toCreate } of plan) {
  for (let i = 0; i < toCreate; i++) {
    try {
      const college = pick(COLLEGES, createdRegs);
      const regNumber = await nextRegNumber();
      const captain = fakeParticipant(personCounter++, ev.gender, college);

      if (isTeam) {
        const min = ev.team_size_min ?? 4;
        const max = ev.team_size_max ?? 8;
        // Team 1 at min size, team 2 mid-size (varied but always in range).
        const size = Math.min(
          max,
          Math.max(min, min + (i === 0 ? 0 : Math.floor((max - min) / 2))),
        );
        const teamName = pick(TEAM_NAMES, createdTeams);

        const captainId = await resolveParticipant(captain);
        const { data: reg, error: regErr } = await admin
          .from("registrations")
          .insert({
            registration_number: regNumber,
            event_id: ev.id,
            participant_id: captainId,
            mode: "team",
            status: "confirmed",
          })
          .select("id")
          .single();
        if (regErr) throw new Error(`reg insert: ${regErr.message}`);

        const { data: team, error: teamErr } = await admin
          .from("teams")
          .insert({
            registration_id: reg.id,
            team_name: teamName,
            captain_id: captainId,
          })
          .select("id")
          .single();
        if (teamErr) throw new Error(`team insert: ${teamErr.message}`);

        // Members: captain first, then fresh demo identities.
        const members = [captain];
        for (let m = 1; m < size; m++) {
          const mp = fakeParticipant(personCounter++, ev.gender, college);
          members.push(mp);
        }
        const rows = members.map((m, idx) => ({
          team_id: team.id,
          name: m.full_name,
          roll_number: m.roll_number,
          email: m.email,
          phone: m.mobile,
          college: m.college,
          department: m.department,
          year: m.year_of_study,
          gender: m.gender,
          role: idx === 0 ? "captain" : "member",
        }));
        const { error: memErr } = await admin
          .from("team_members")
          .insert(rows);
        if (memErr) throw new Error(`members insert: ${memErr.message}`);

        createdRegs++;
        createdTeams++;
      } else {
        const participantId = await resolveParticipant(captain);
        const { error: regErr } = await admin
          .from("registrations")
          .insert({
            registration_number: regNumber,
            event_id: ev.id,
            participant_id: participantId,
            mode: "individual",
            status: "confirmed",
          });
        if (regErr) throw new Error(`reg insert: ${regErr.message}`);
        createdRegs++;
      }
      console.log(`  ✓ ${ev.slug}: ${regNumber}`);
    } catch (e) {
      errors.push(`${ev.slug}: ${e.message}`);
      console.error(`  ✗ ${ev.slug}: ${e.message}`);
    }
  }
}

console.log(
  `\nDone. created=${createdRegs} (teams=${createdTeams})` +
    (errors.length ? ` · ${errors.length} error(s)` : " · no errors"),
);
if (errors.length) process.exit(1);
