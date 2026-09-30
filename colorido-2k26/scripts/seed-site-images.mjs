/**
 * Site images seeder — wires the provided COLORIDO 2K26 image assets
 * (public/images/colorido/) into the existing architecture.
 *
 * 1. EVENTS   → sets events.banner_image to the static public path of each
 *               event's banner (event cards + event detail hero render it).
 * 2. GALLERY  → uploads the 4 Gallery-*.png files to the EXISTING public
 *               'gallery' Storage bucket (category-scoped paths, same
 *               convention as the admin upload action) and inserts published
 *               gallery rows. No new tables, buckets or APIs.
 *
 * Re-runnable: banners are updated in place; gallery rows are matched by
 * storage_path before inserting (upsert semantics, no duplicates).
 *
 *   npm run seed:images          (dry run: shows the plan, writes nothing)
 *   npm run seed:images -- --yes (writes)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const APPLY = process.argv.includes("--yes");
const BANNER_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "images",
  "colorido",
);
const BUCKET = "gallery";

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

// ---------------------------------------------------------------- mapping ---
// Filename (case/space-insensitive stem) → events.slug. The user names files
// meaningfully; this is the ONLY mapping source (no guessing beyond the name).
const FILE_STEM_TO_SLUG = {
  "fine arts": "fine-arts",
  "music solo": "music-band-solo",
  "music group": "music-band-group",
  "dance solo": "dance-solo",
  "dance group": "dance-group",
  choreoday: "choreoday-theme-based",
  dramatics: "dramatics",
  "fashion show": "fashion-show",
  tekraft: "tekraft-events",
  literary: "literary",
  basketball: "basketball-boys",
  volleyball: "volleyball-boys",
  "tt(boys)": "table-tennis-boys",
  "tt(girls)": "table-tennis-girls",
  throwball: "throwball-girls",
  tennikoit: "tennikoit-girls",
};

// Gallery-*.png categories were confirmed by viewing each image.
const GALLERY_FILES = [
  { file: "Gallery-1.png", title: "Festival Courtyard", category: "cultural" },
  { file: "Gallery-2.png", title: "Classical Dance Performance", category: "cultural" },
  { file: "Gallery-3.png", title: "Team Huddle", category: "sports" },
  { file: "Gallery-4.png", title: "Backstage Preparations", category: "behind_the_scenes" },
];

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function findImage(stem) {
  const key = stem.toLowerCase().replace(/\s+/g, " ");
  const files = readdirSync(BANNER_DIR);
  return files.find(
    (f) => path.parse(f).name.toLowerCase().replace(/\s+/g, " ") === key,
  );
}

// ------------------------------------------------------------------ events ---
const { data: events, error: evErr } = await admin
  .from("events")
  .select("id, slug, name, banner_image");
if (evErr) {
  console.error("✗ events query failed:", evErr.message);
  process.exit(1);
}

let banners = 0;
const errors = [];

for (const ev of events) {
  const stemEntry = Object.entries(FILE_STEM_TO_SLUG).find(
    ([, slug]) => slug === ev.slug,
  );
  if (!stemEntry) {
    console.log(`  ⚠ no image mapping for ${ev.slug} — skipped`);
    continue;
  }
  const file = findImage(stemEntry[0]);
  if (!file) {
    console.log(`  ⚠ no file found for ${ev.slug} (expected stem "${stemEntry[0]}") — skipped`);
    continue;
  }
  const webPath = `/images/colorido/${encodeURIComponent(file)}`;

  if (!APPLY) {
    console.log(`  [dry-run] ${ev.slug}: banner_image = ${webPath}`);
    banners++;
    continue;
  }
  const { error } = await admin
    .from("events")
    .update({ banner_image: webPath })
    .eq("id", ev.id);
  if (error) errors.push(`${ev.slug}: ${error.message}`);
  else {
    banners++;
    console.log(`  ✓ ${ev.slug}: banner_image = ${webPath}`);
  }
}

// ----------------------------------------------------------------- gallery ---
const galleryPlan = GALLERY_FILES.filter((g) => existsSync(path.join(BANNER_DIR, g.file)));

for (const g of galleryPlan) {
  const storagePath = `${g.category}/${g.file}`; // same convention as admin upload
  const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

  if (!APPLY) {
    console.log(`  [dry-run] gallery: ${g.file} → ${storagePath} (${g.category})`);
    continue;
  }

  // Idempotency: skip if a row with this storage_path already exists.
  const { data: existing } = await admin
    .from("gallery")
    .select("id")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (existing) {
    console.log(`  = gallery: ${storagePath} already seeded`);
    continue;
  }

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, readFileSync(path.join(BANNER_DIR, g.file)), {
      contentType: MIME_BY_EXT[path.extname(g.file).toLowerCase()] ?? "image/png",
      upsert: false,
    });
  if (upErr) {
    errors.push(`gallery ${g.file}: ${upErr.message}`);
    continue;
  }

  const { error: dbErr } = await admin.from("gallery").insert({
    title: g.title,
    storage_path: storagePath,
    category: g.category,
    event_id: null,
    is_published: true,
    display_order: 0,
  });
  if (dbErr) {
    // Roll back the orphaned storage object (mirrors admin action).
    await admin.storage.from(BUCKET).remove([storagePath]);
    errors.push(`gallery row ${g.file}: ${dbErr.message}`);
    continue;
  }
  console.log(`  ✓ gallery: ${g.file} → ${storagePath} (${g.category})`);
  void publicUrl;
}

console.log(
  `\nDone. banners ${APPLY ? "updated" : "planned"}=${banners}/${events.length} · ` +
    `gallery ${APPLY ? "uploaded" : "planned"}=${galleryPlan.length}` +
    (errors.length ? ` · ${errors.length} ERRORS:\n${errors.join("\n")}` : " · no errors"),
);
