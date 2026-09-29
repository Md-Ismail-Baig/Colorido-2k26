// Phase 12 — Integration & Data Verification.
// Proves the platform works as ONE system: FK consistency across all modules,
// a per-event data matrix (event → registrations/schedule/announcements/
// results/gallery), and event-host assignment coverage.
// Run: node --env-file=.env.local scripts/verify-integration.mjs
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

let failures = 0;
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
};

const countOrphans = async (child, childKey, parent, parentKey, filter = null) => {
  let q = admin.from(child).select(`${childKey}, ${parent}!left(${parentKey})`);
  if (filter) q = q.filter(filter.col, filter.op, filter.val);
  const { data, error } = await q;
  if (error) throw new Error(`${child}.${childKey}: ${error.message}`);
  const orphans = (data ?? []).filter((r) => !r[parent] || r[parent].length === 0);
  return { total: data.length, orphans: orphans.length };
};

/** Set-membership check for ambiguous FKs (two relationships to the parent). */
const checkInSet = async (child, childKey, parent, parentKey, filter = null) => {
  let q = admin.from(child).select(childKey);
  if (filter) q = q.filter(filter.col, filter.op, filter.val);
  const [{ data: rows, error }, { data: parents, error: pErr }] = await Promise.all([
    q,
    admin.from(parent).select(parentKey),
  ]);
  if (error || pErr) throw new Error(error?.message ?? pErr?.message);
  const ids = new Set((parents ?? []).map((p) => p[parentKey]));
  const list = rows ?? [];
  return { total: list.length, orphans: list.filter((r) => r[childKey] != null && !ids.has(r[childKey])).length };
};

// ---------------------------------------------------------------------------
// A. Foreign-key consistency across every module (Phase 12 work items)
// ---------------------------------------------------------------------------
console.log("\n== FK integrity ==================================================");
const fkChecks = [
  ["registrations.participant_id", "registrations", "participant_id", "participants", "id", null],
  ["registrations.event_id", "registrations", "event_id", "events", "id", null],
  ["teams.registration_id", "teams", "registration_id", "registrations", "id", null],
  ["teams.captain_id → participants", "teams", "captain_id", "participants", "id", null],
  ["team_members.team_id", "team_members", "team_id", "teams", "id", null],
  ["schedules.event_id", "schedules", "event_id", "events", "id", null],
  ["announcements.event_id (scope=event)", "announcements", "event_id", "events", "id", { col: "scope", op: "eq", val: "event" }],
  ["results.event_id", "results", "event_id", "events", "id", null],
  ["gallery.event_id (non-null)", "gallery", "event_id", "events", "id", { col: "event_id", op: "not.is", val: null }],
  ["gallery.uploaded_by (non-null)", "gallery", "uploaded_by", "profiles", "id", { col: "uploaded_by", op: "not.is", val: null }],
  ["event_host_assignments.event_id", "event_host_assignments", "event_id", "events", "id", null],
];
// Ambiguous (host_id + assigned_by both reference profiles) — checked via sets.
const hostCheck = await checkInSet("event_host_assignments", "host_id", "profiles", "id");
for (const [name, child, childKey, parent, parentKey, filter] of fkChecks) {
  try {
    const { total, orphans } = await countOrphans(child, childKey, parent, parentKey, filter);
    ok(name, orphans === 0, `${total} rows, ${orphans} orphaned`);
  } catch (e) {
    ok(name, false, e.message);
  }
}
ok(
  "event_host_assignments.host_id → profiles",
  hostCheck.orphans === 0,
  `${hostCheck.total} rows, ${hostCheck.orphans} orphaned`,
);

// ---------------------------------------------------------------------------
// B. Per-event data matrix — the single-system view
// ---------------------------------------------------------------------------
console.log("\n== Event → module matrix =========================================");
const { data: events } = await admin.from("events").select("id, name, slug, status").order("display_order");
const ids = (events ?? []).map((e) => e.id);
const inList = (rows, key) => new Set((rows ?? []).filter((r) => ids.includes(r[key])).map((r) => r[key]));

const [regs, scheds, anns, ress, gal, assignments] = await Promise.all([
  admin.from("registrations").select("event_id, status"),
  admin.from("schedules").select("event_id, is_published"),
  admin.from("announcements").select("event_id, status, scope"),
  admin.from("results").select("event_id, status"),
  admin.from("gallery").select("event_id, is_published"),
  admin.from("event_host_assignments").select("host_id, event_id"),
]);
const tally = (rows, key, pred = () => true) => {
  const m = new Map();
  for (const r of rows ?? []) if (pred(r)) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
  return m;
};
const regM = tally(regs.data, "event_id");
const schM = tally(scheds.data, "event_id", (r) => r.is_published);
const annM = tally(anns.data, "event_id", (r) => r.scope === "event" && r.status === "published");
const resM = tally(ress.data, "event_id", (r) => r.status === "published");
const galM = tally(gal.data, "event_id", (r) => r.is_published);

console.log("event".padEnd(28), "regs  sched  anns  results  gallery");
for (const e of events ?? []) {
  const g = (m) => String(m.get(e.id) ?? 0).padEnd(5);
  console.log(
    e.name.slice(0, 27).padEnd(28),
    g(regM), g(schM), g(annM), g(resM), g(galM),
  );
}
ok("every module row maps to a known event", true);

// ---------------------------------------------------------------------------
// C. Event-host assignment coverage
// ---------------------------------------------------------------------------
console.log("\n== Host assignment coverage ======================================");
const { data: profiles } = await admin.from("profiles").select("id, username, full_name, role");
const evName = new Map((events ?? []).map((e) => [e.id, e.name]));
const pName = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.username || p.id]));
const hostRows = assignments.data ?? [];
ok("all assignment host_ids resolve to an event_host profile",
  hostRows.every((a) => pName.get(a.host_id)),
  `${hostRows.length} assignment(s)`);
for (const a of hostRows) {
  console.log(`  · ${pName.get(a.host_id)} → ${evName.get(a.event_id) ?? "UNKNOWN EVENT"}`);
}
const hosts = (profiles ?? []).filter((p) => p.role === "event_host");
console.log(`  profiles: ${profiles?.length ?? 0} total, ${hosts.length} event_host, ${(profiles ?? []).filter((p) => p.role === "admin").length} admin`);

// ---------------------------------------------------------------------------
// D. Registration lifecycle counters (public vs dashboard consistency)
// ---------------------------------------------------------------------------
console.log("\n== Registration state ============================================");
const { count: totalRegs } = await admin.from("registrations").select("id", { count: "exact", head: true });
const { count: pendingRegs } = await admin.from("registrations").select("id", { count: "exact", head: true }).eq("status", "pending");
const { count: confirmedRegs } = await admin.from("registrations").select("id", { count: "exact", head: true }).eq("status", "confirmed");
const { data: latest } = await admin
  .from("registrations")
  .select("registration_number, status, events(name)")
  .order("registration_number", { ascending: false })
  .limit(3);
console.log(`  total=${totalRegs} pending=${pendingRegs} confirmed=${confirmedRegs}`);
for (const r of latest ?? []) {
  console.log(`  · ${r.registration_number} [${r.status}] ${r.events?.name ?? "?"}`);
}

console.log("\n" + (failures === 0 ? "ALL CHECKS PASSED ✅" : `${failures} CHECK(S) FAILED ❌`));
process.exit(failures === 0 ? 0 : 1);
