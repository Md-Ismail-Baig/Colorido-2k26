// One-off cleanup: remove temporary E2E accounts used to verify the consoles.
// Deleting the auth user cascades to profiles -> event_host_assignments
// (FK ON DELETE CASCADE per migration 0001).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("MISSING_ENV");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TARGETS = ["temp-admin@e2e-test.example.com", "temp-host@e2e-test.example.com"];

const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 500 });
if (listErr) {
  console.error("LIST_FAILED", listErr.message);
  process.exit(1);
}

const matches = list.users.filter((u) => TARGETS.includes(u.email));
console.log(`found=${matches.length} of ${TARGETS.length}`);

for (const u of matches) {
  const { error } = await admin.auth.admin.deleteUser(u.id);
  console.log(error ? `DELETE_FAILED ${u.email}: ${error.message}` : `DELETED ${u.email}`);
}

// Verify the cascade: re-list and check tables are clean.
const { data: after } = await admin.auth.admin.listUsers({ perPage: 500 });
const remaining = after.users.filter((u) => TARGETS.includes(u.email));
console.log(`remaining_auth_users=${remaining.length}`);

const { count: profileCount } = await admin
  .from("profiles")
  .select("id", { count: "exact", head: true });
console.log(`profiles_remaining=${profileCount}`);

const { count: assignmentCount } = await admin
  .from("event_host_assignments")
  .select("id", { count: "exact", head: true });
console.log(`assignments_remaining=${assignmentCount}`);

// Confirm festival data is untouched + capture sequence state for the report.
const [{ count: regCount }, { data: latest }] = await Promise.all([
  admin.from("registrations").select("id", { count: "exact", head: true }),
  admin
    .from("registrations")
    .select("registration_number")
    .order("registration_number", { ascending: false })
    .limit(1),
]);
console.log(`registrations=${regCount}`);
console.log(`latest_registration_number=${latest?.[0]?.registration_number ?? "none"}`);
console.log("CLEANUP_DONE");
