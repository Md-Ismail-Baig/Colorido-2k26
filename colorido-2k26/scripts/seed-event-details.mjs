/**
 * Festival content seeder — real event details for all 16 events.
 *
 * Fills, per event: venue, reporting/start/end time, registration deadline,
 * eligibility, rules, judging criteria — and inserts published schedule
 * slots (the "Event Schedule" section on the public page).
 *
 * Venues are R.V.R. & J.C. College of Engineering campus spaces (Guntur),
 * staggered so no venue hosts two events at once.
 *
 * Re-runnable: event fields are updated in place; schedule slots flip
 * is_published=true rather than duplicating.
 *
 *   npm run seed:details
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

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

// Shared copy blocks --------------------------------------------------------
const ELIGIBILITY = (extra = "") =>
  `Open to all college students with a valid ID card. Participants must carry their college ID and the festival entry pass. Cross-college participation is welcome.${extra}`;

const JUDGING = (points) => points.map((p, i) => `${i + 1}. ${p}`).join("\n");

const RULES = (lines) => lines.map((l, i) => `${i + 1}. ${l}`).join("\n");

// ---------------------------------------------------------------- content ---
const CONTENT = {
  "fine-arts": {
    venue: "Open Air Art Deck — Main Block Lawn",
    reporting: "08:30",
    start: "09:00",
    end: "12:30",
    eligibility: ELIGIBILITY(),
    rules: RULES([
      "Spot topic will be announced at the venue — no prepared artwork.",
      "Only dry media (pencils, charcoals, pastels); canvas/sheet provided by the organisers.",
      "2.5 hours of work time; canvases must remain untouched after the final bell.",
      "Do not sign or mark the front of the artwork — identification is by registration number only.",
    ]),
    judging: JUDGING([
      "Composition and originality of concept (30%)",
      "Technique, line quality and control (30%)",
      "Use of the given space and palette discipline (20%)",
      "Overall impact and finish (20%)",
    ]),
  },
  "music-band-solo": {
    venue: "Mini Auditorium — Block B, First Floor",
    reporting: "09:00",
    start: "09:45",
    end: "13:00",
    eligibility: ELIGIBILITY(),
    rules: RULES([
      "Maximum 5 minutes per performance; 2 minutes of sound check.",
      "A keyboard and one aux cable will be provided — bring your own instruments.",
      "Backing tracks are permitted for accompaniment only, not lead vocals.",
      "Vulgar lyrics or gestures lead to immediate disqualification.",
    ]),
    judging: JUDGING([
      "Vocal quality / instrumental command (30%)",
      "Sur, tala and rhythm accuracy (25%)",
      "Stage presence and audience connect (25%)",
      "Choice and interpretation of the piece (20%)",
    ]),
  },
  "music-band-group": {
    venue: "Main Open Air Stage",
    reporting: "13:00",
    start: "14:00",
    end: "17:30",
    eligibility: ELIGIBILITY(),
    rules: RULES([
      "Teams of 4–8 members including the vocalist(s).",
      "Maximum 8 minutes per band; 5 minutes of setup and line check.",
      "Drum kit, keyboard, and 4 input channels are provided — other gear is BYO.",
      "One member per band must report at the sound desk 30 minutes before the slot.",
    ]),
    judging: JUDGING([
      "Cohesion and ensemble tightness (30%)",
      "Vocal and instrumental proficiency (30%)",
      "Arrangement, originality and energy (25%)",
      "Crowd response (15%)",
    ]),
  },
  "dance-solo": {
    venue: "Dance Floor 1 — Seminar Hall, Block A",
    reporting: "08:00",
    start: "08:45",
    end: "12:00",
    eligibility: ELIGIBILITY(),
    rules: RULES([
      "Maximum 4 minutes per performance; file must reach the DJ desk at reporting.",
      "Classical, semi-classical, contemporary and hip-hop styles are all welcome.",
      "One accompanist is allowed only if declared at registration.",
      "Props that scatter material on stage (powder, water, fire) are banned.",
    ]),
    judging: JUDGING([
      "Technique, footwork and control (30%)",
      "Expression and abhinaya (25%)",
      "Choreography and music interpretation (25%)",
      "Costume, grooming and stage presence (20%)",
    ]),
  },
  "dance-group": {
    venue: "Main Open Air Stage",
    reporting: "09:00",
    start: "10:00",
    end: "13:30",
    eligibility: ELIGIBILITY(),
    rules: RULES([
      "Teams of 6–12 members; maximum 6 minutes per performance.",
      "Track must be submitted on a labelled pen drive at reporting (MP3 only).",
      "Formation changes and transitions should be rehearsed to the time limit.",
      "No pyrotechnics, fog machines or liquid props.",
    ]),
    judging: JUDGING([
      "Synchronisation and formation work (30%)",
      "Energy, stamina and coverage of the floor (25%)",
      "Concept, costume and theme clarity (25%)",
      "Music mix quality (20%)",
    ]),
  },
  "choreoday-theme-based": {
    venue: "Dance Floor 2 — Seminar Hall, Block A",
    reporting: "13:30",
    start: "14:15",
    end: "17:00",
    eligibility: ELIGIBILITY(),
    rules: RULES([
      "Teams of 8–15 members; performance length 5–7 minutes.",
      "A one-line theme title must be declared at reporting; narrative must be visible on stage.",
      "Voice-overs, recorded dialogues and shadow play are allowed.",
      "Sets must be load-in/load-out ready within 3 minutes.",
    ]),
    judging: JUDGING([
      "Storytelling and emotional arc (30%)",
      "Choreography innovation (30%)",
      "Music design and lighting use (20%)",
      "Group precision (20%)",
    ]),
  },
  dramatics: {
    venue: "Amphitheatre — Behind Library Block",
    reporting: "09:00",
    start: "10:00",
    end: "13:30",
    eligibility: ELIGIBILITY(),
    rules: RULES([
      "Teams of 6–10; stage time 10–15 minutes including setup.",
      "Language: Telugu, English or Hindi — declare at reporting.",
      "Microphones (2 handheld + 1 collar) and basic lighting are provided.",
      "Obscenity, targeted satire or political content leads to disqualification.",
    ]),
    judging: JUDGING([
      "Script and narrative strength (30%)",
      "Acting, diction and comic/dramatic timing (30%)",
      "Direction, blocking and use of stage (25%)",
      "Sets, costumes and props effectiveness (15%)",
    ]),
  },
  "fashion-show": {
    venue: "Main Open Air Stage",
    reporting: "15:00",
    start: "16:00",
    end: "18:30",
    eligibility: ELIGIBILITY(),
    rules: RULES([
      "Teams of 8–14 walking members plus a declared backstage crew of up to 4.",
      "One theme walk of 6–8 minutes; the theme must be declared at registration.",
      "Music track on a labelled pen drive; walk order must be submitted at reporting.",
      "Decency norms apply — the dress code decision of the committee is final.",
    ]),
    judging: JUDGING([
      "Theme interpretation and costume design (35%)",
      "Ramp walk, poise and confidence (30%)",
      "Choreography and formations (20%)",
      "Music, lighting and overall polish (15%)",
    ]),
  },
  "tekraft-events": {
    venue: "Cad Lab — Block D, Ground Floor",
    reporting: "09:00",
    start: "09:30",
    end: "12:30",
    eligibility: ELIGIBILITY(),
    rules: RULES([
      "Individual entry; the craft challenge is announced on the spot.",
      "Materials provided: card, foam, skewers, thread, tape; basic tools are BYO.",
      "2 hours of build time followed by a 2-minute pitch to the judges.",
      "No pre-built components — judging starts from raw material tables.",
    ]),
    judging: JUDGING([
      "Creativity and originality of the build (35%)",
      "Craftsmanship and finish (30%)",
      "Clever use of the given materials (20%)",
      "Pitch clarity (15%)",
    ]),
  },
  literary: {
    venue: "Seminar Hall 2 — Block C, Second Floor",
    reporting: "08:30",
    start: "09:15",
    end: "13:00",
    eligibility: ELIGIBILITY(),
    rules: RULES([
      "Three rounds: extempore, debate, and storytelling/poetry.",
      "Extempore prep time is 2 minutes; speaking 2–3 minutes.",
      "Debate sides are drawn by lot; rebuttals are capped at 1 minute.",
      "Personal attacks or unparliamentary language ends the attempt.",
    ]),
    judging: JUDGING([
      "Content depth and reasoning (35%)",
      "Fluency, diction and grammar (30%)",
      "Persuasion and rebuttal skill (20%)",
      "Stage confidence (15%)",
    ]),
  },
  "basketball-boys": {
    venue: "College Basketball Court",
    reporting: "07:30",
    start: "08:00",
    end: "13:00",
    eligibility: ELIGIBILITY(
      " Teams of 5–10 players plus a declared coach/manager. FIBA rules apply.",
    ),
    rules: RULES([
      "Knockout format; 4 quarters of 8 minutes running clock.",
      "Team jerseys with distinct numbers are mandatory.",
      "Two personal time-outs per team per half.",
      "Five fouls eliminate a player; a match forfeit is 0–20.",
      "The referee's decision is final in all disputes.",
    ]),
    judging: JUDGING([
      "Fixtures decided on match wins; tie-break on head-to-head, then points difference.",
      "Fair-play points may be applied by the tournament committee.",
      "Best player awards are decided per knockout stage.",
      "Protest window: 15 minutes after the final whistle, in writing.",
    ]),
  },
  "volleyball-boys": {
    venue: "Volleyball Courts — Sports Complex",
    reporting: "07:30",
    start: "08:00",
    end: "13:00",
    eligibility: ELIGIBILITY(
      " Teams of 6–10 players. Rally-point volleyball rules apply.",
    ),
    rules: RULES([
      "Best of three sets to 25 points (15 in the decider), rally-point scoring.",
      "Knockout format; teams must be courtside 10 minutes before the whistle.",
      "Numbered jerseys are recommended; identical colours will be resolved by bibs.",
      "Net touches, lifts and double contacts follow standard FIVB calls.",
      "Two 30-second timeouts per team per set.",
    ]),
    judging: JUDGING([
      "Fixtures decided on match wins; tie-break on set difference.",
      "Service aces, blocks and spikes stats feed the best-player award.",
      "Conduct points influence the fair-play team award.",
      "Protest window: 10 minutes after match point, in writing.",
    ]),
  },
  "table-tennis-boys": {
    venue: "Indoor TT Hall — Sports Complex",
    reporting: "08:00",
    start: "08:30",
    end: "12:30",
    eligibility: ELIGIBILITY(),
    rules: RULES([
      "Singles knockout; best of three games to 11 points.",
      "Quarter-finals onwards are best of five.",
      "Standard 40+ plastic balls provided — no personal balls in play.",
      "Serve alternates every 2 points; deuce rules apply from 10-all.",
      "Report to the table umpire 5 minutes before the call.",
    ]),
    judging: JUDGING([
      "Fixtures decided on match wins per bracket.",
      "Game difference breaks bracket ties.",
      "Umpire calls are final; stroke decisions cannot be protested.",
      "Equipment checks happen at the umpire's discretion.",
    ]),
  },
  "throwball-girls": {
    venue: "Throwball Court — Sports Complex",
    reporting: "08:00",
    start: "08:45",
    end: "13:00",
    eligibility: ELIGIBILITY(
      " Teams of 7–12 players. Standard throwball rules apply.",
    ),
    rules: RULES([
      "Best of three sets to 15 points, rally-point scoring.",
      "Service must be executed behind the baseline without crossing.",
      "Catch-and-throw in one motion; a held ball is a foul.",
      "Knockout format; rotations must follow the submitted score sheet.",
      "Two timeouts of 30 seconds per team per set.",
    ]),
    judging: JUDGING([
      "Fixtures decided on match wins; tie-break on set difference.",
      "Best server and best defender awards from match statistics.",
      "Fair-play conduct points apply across the bracket.",
      "Protest window: 10 minutes after the final whistle, in writing.",
    ]),
  },
  "tennikoit-girls": {
    venue: "TenniKoit Rings — Sports Ground",
    reporting: "08:30",
    start: "09:00",
    end: "12:30",
    eligibility: ELIGIBILITY(),
    rules: RULES([
      "Singles knockout; best of three ends per match.",
      "Standard ring weight and ring distance per Fed rules — equipment provided.",
      "Eight rings per end; the score-sheet sign-off closes the end.",
      "Foot faults cancel the throw; ring-out scores zero.",
      "Report to the ring marshal 5 minutes before the call.",
    ]),
    judging: JUDGING([
      "Fixtures decided on match wins per bracket.",
      "Ring-difference breaks bracket ties.",
      "Marshal's calls are final on distance and foot faults.",
      "Grip aids (powder/resin) are permitted outside the throwing arc only.",
    ]),
  },
  "table-tennis-girls": {
    venue: "Indoor TT Hall — Sports Complex",
    reporting: "13:00",
    start: "13:30",
    end: "17:00",
    eligibility: ELIGIBILITY(),
    rules: RULES([
      "Singles knockout; best of three games to 11 points.",
      "Semi-finals and final are best of five.",
      "Standard 40+ plastic balls provided — no personal balls in play.",
      "Serve alternates every 2 points; deuce rules apply from 10-all.",
      "Report to the table umpire 5 minutes before the call.",
    ]),
    judging: JUDGING([
      "Fixtures decided on match wins per bracket.",
      "Game difference breaks bracket ties.",
      "Umpire calls are final; stroke decisions cannot be protested.",
      "Equipment checks happen at the umpire's discretion.",
    ]),
  },
};

const MAP_URL = "https://maps.app.goo.gl/eTuS9gpu3PTThYdN6";
const DEADLINE = "2026-12-20"; // uniform deadline, one week before the festival

// ------------------------------------------------------------------ main ----
const { data: events, error: evErr } = await admin
  .from("events")
  .select("id, name, slug, event_date, display_order")
  .eq("is_active", true)
  .order("display_order");
if (evErr) {
  console.error("✗ events query failed:", evErr.message);
  process.exit(1);
}

let updated = 0;
let slots = 0;
const errors = [];

for (const ev of events) {
  const c = CONTENT[ev.slug];
  if (!c) {
    console.log(`  ⚠ no content for ${ev.slug} — skipped`);
    continue;
  }

  const { error: upErr } = await admin
    .from("events")
    .update({
      venue: c.venue,
      start_time: c.start,
      end_time: c.end,
      reporting_time: c.reporting,
      registration_deadline: DEADLINE,
      eligibility: c.eligibility,
      rules: c.rules,
      judging_criteria: c.judging,
    })
    .eq("id", ev.id);
  if (upErr) {
    errors.push(`${ev.slug}: ${upErr.message}`);
    continue;
  }
  updated++;

  // Schedule slots: one reporting slot + one competition slot, published.
  const existing = await admin
    .from("schedules")
    .select("id, round, is_published")
    .eq("event_id", ev.id);

  const want = [
    {
      event_id: ev.id,
      event_date: ev.event_date,
      start_time: c.reporting,
      end_time: c.start,
      venue: `${c.venue} · Reporting Desk`,
      round: "Reporting",
      reporting_time: c.reporting,
      status: "scheduled",
      is_published: true,
    },
    {
      event_id: ev.id,
      event_date: ev.event_date,
      start_time: c.start,
      end_time: c.end,
      venue: c.venue,
      round: "Competition",
      reporting_time: c.reporting,
      status: "scheduled",
      is_published: true,
    },
  ];

  for (const w of want) {
    const match = (existing.data ?? []).find(
      (s) => s.round === w.round && s.is_published,
    );
    if (match) {
      const { error } = await admin
        .from("schedules")
        .update(w)
        .eq("id", match.id);
      if (error) errors.push(`${ev.slug} slot: ${error.message}`);
      else slots++;
    } else {
      const { error } = await admin.from("schedules").insert(w);
      if (error) errors.push(`${ev.slug} slot: ${error.message}`);
      else slots++;
    }
  }
  console.log(`  ✓ ${ev.slug}: details + schedule (${c.start}–${c.end} · ${c.venue})`);
}

console.log(
  `\nDone. events updated=${updated}/${events.length} · schedule slots upserted=${slots}` +
    (errors.length ? ` · ${errors.length} ERRORS:\n${errors.join("\n")}` : " · no errors"),
);
console.log(`Map link for reference: ${MAP_URL}`);
if (errors.length) process.exit(1);
