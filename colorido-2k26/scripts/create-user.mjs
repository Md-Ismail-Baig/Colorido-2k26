/**
 * COLORIDO 2K26 — Staff user creation (ADMIN USE ONLY).
 *
 * Creates Admin or Event Host accounts via the service-role key.
 * Run locally from the project folder:
 *
 *   npm run create-user -- admin@example.com StrongPass123 admin
 *   npm run create-user -- host@example.com  StrongPass123 host dance-solo
 *
 * The optional 4th argument assigns an event (by slug) to a host.
 * The auto-profile trigger (migration 0001) creates the profile row;
 * this script then sets the correct role.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

const [email, password, role, eventSlug] = process.argv.slice(2);

if (!email || !password || !role || !["admin", "host"].includes(role)) {
  console.error(
    "Usage: npm run create-user -- <email> <password> <admin|host> [event-slug]\n" +
      "Example: npm run create-user -- host@college.edu Passw0rd! host dance-solo",
  );
  process.exit(1);
}

if (!existsSync(".env.local")) {
  console.error("✗ .env.local not found — run from the colorido-2k26 folder.");
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

// 1. Create the auth user (auto-confirm; profile row is created by trigger).
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (createErr) {
  if (/already/i.test(createErr.message)) {
    console.error(`✗ ${email} already exists.`);
  } else {
    console.error("✗ Failed to create user:", createErr.message);
  }
  process.exit(1);
}

const userId = created.user.id;

// 2. Set the role on the profile row (bypasses RLS via service role).
const appRole = role === "admin" ? "admin" : "event_host";
const { error: roleErr } = await admin
  .from("profiles")
  .update({ role: appRole })
  .eq("id", userId);

if (roleErr) {
  console.error("✗ Auth user created but role update failed:", roleErr.message);
  process.exit(1);
}

console.log(`✓ ${appRole} account ready: ${email}`);

// 3. Optional event assignment for hosts.
if (role === "host" && eventSlug) {
  const { data: ev, error: evErr } = await admin
    .from("events")
    .select("id, name")
    .eq("slug", eventSlug)
    .single();

  if (evErr || !ev) {
    console.error(`✗ Event slug "${eventSlug}" not found.`);
    process.exit(1);
  }

  const { error: aErr } = await admin
    .from("event_host_assignments")
    .insert({ host_id: userId, event_id: ev.id });

  if (aErr && !/duplicate/i.test(aErr.message)) {
    console.error("✗ Assignment failed:", aErr.message);
    process.exit(1);
  }

  console.log(`✓ Assigned event: ${ev.name}`);
} else if (role === "host") {
  console.log("  (no event assigned yet — re-run with an event slug)");
}

console.log("\nDone. This account can now sign in at /login.");
