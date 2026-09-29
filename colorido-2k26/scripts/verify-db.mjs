/**
 * COLORIDO 2K26 — Database verification script (Phase 1 acceptance).
 *
 * Usage:  npm run verify:db
 * Uses the public Supabase credentials from .env.local (read-only checks).
 *
 * Verifies:
 *  - 16 documented events seeded with the correct category/gender breakdown
 *  - announcements are published-only (drafts invisible)
 *  - RLS blocks anonymous reads of private tables
 *  - sponsors table is empty (no invented sponsors)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

if (!existsSync(".env.local")) {
  console.error("✗ .env.local not found — add your Supabase credentials first.");
  process.exit(1);
}

// Minimal .env parser (no dependency needed).
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("✗ Supabase URL/key missing in .env.local");
  process.exit(1);
}

const sb = createClient(url, key);

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

console.log("\n=== COLORIDO 2K26 — Phase 1 Database Verification ===\n");

// ---------------------------------------------------------------- events
const { count: eventCount, error: e1 } = await sb
  .from("events")
  .select("id", { count: "exact" });
check("Events table reachable", !e1, e1?.message ?? "");

const { data: evs, error: e2 } = await sb
  .from("events")
  .select("name, slug, category, gender, registration_mode, status");
if (!e2 && evs) {
  const cultural = evs.filter((e) => e.category === "cultural").length;
  const boys = evs.filter(
    (e) => e.category === "sports" && e.gender === "boys",
  ).length;
  const girls = evs.filter(
    (e) => e.category === "sports" && e.gender === "girls",
  ).length;
  check("Exactly 16 events seeded", evs.length === 16, `found ${evs.length}`);
  check("10 cultural events", cultural === 10, `found ${cultural}`);
  check("3 boys sports events", boys === 3, `found ${boys}`);
  check("3 girls sports events", girls === 3, `found ${girls}`);
  check(
    "All events published + active",
    evs.every((e) => e.status === "published"),
  );
} else {
  check("Events readable", false, e2?.message ?? "");
}

// ---------------------------------------------------------- announcements
const { count: annCount, error: e3 } = await sb
  .from("announcements")
  .select("id", { count: "exact" });
check(
  "Announcements visible (published only)",
  !e3 && annCount === 2,
  e3 ? e3.message : `public sees ${annCount} of 3 seeded (draft hidden)`,
);

// ------------------------------------------------------------ RLS checks
console.log("\nRLS protection (anon must see 0 rows):");
for (const table of [
  "participants",
  "registrations",
  "contact_messages",
  "profiles",
]) {
  const { count, error } = await sb.from(table).select("id", { count: "exact" });
  check(
    `${table} locked down`,
    !error && count === 0,
    error ? error.message : `anon sees ${count} rows`,
  );
}

// -------------------------------------------------------------- sponsors
const { count: spCount, error: e5 } = await sb
  .from("sponsors")
  .select("id", { count: "exact" });
check(
  "Sponsors empty (no invented data)",
  !e5 && spCount === 0,
  e5 ? e5.message : `${spCount} rows`,
);

console.log(
  failures === 0
    ? "\n✅ ALL CHECKS PASSED — Phase 1 database is correct.\n"
    : `\n✗ ${failures} check(s) failed.\n`,
);
process.exit(failures === 0 ? 0 : 1);
