# COLORIDO 2K26 — Cultural & Sports Festival Platform

A real, database-driven event-management platform for the COLORIDO 2K26
Cultural & Sports Festival (28 December 2026).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase
(PostgreSQL + Auth + Storage + RLS) · Zod · Vercel

---

## 📁 Project structure

```
colorido-2k26/
├── src/
│   ├── middleware.ts            # Login-first gate + admin/host route fences
│   ├── app/
│   │   ├── (public)/            # Public site: home, events, registration,
│   │   │                        # schedule, results, gallery, sponsors,
│   │   │                        # announcements, about, contact
│   │   ├── admin/               # Admin console (14 routes, role: admin)
│   │   ├── host/                # Event Host console (5 routes, role: event_host)
│   │   └── login/               # Staff sign-in + "Enter as viewer" gate
│   ├── components/
│   │   ├── ui/                  # Design-system primitives
│   │   ├── site/                # Public-site sections
│   │   └── dash/                # Console shell + forms/tables for admin & host
│   ├── lib/
│   │   ├── supabase/            # client / server / admin (service-role) clients
│   │   ├── auth/                # session, guards, sign-in server actions
│   │   ├── queries/             # host-event scoping helpers
│   │   └── validations/         # Zod schemas (shared client + server)
│   └── types/                   # Central data model (mirrors the DB schema)
├── scripts/
│   ├── verify-db.mjs            # 12-check database acceptance suite
│   ├── verify-integration.mjs   # Phase 12 FK audit + lifecycle checks
│   ├── verify-qr.mjs            # Phase 16 QR encoder proof (jsqr + reference)
│   ├── seed-demo-data.mjs       # Fake demo registrations for every event
│   ├── create-user.mjs          # Create admin/host staff accounts
│   ├── purge-test-data.mjs      # Pre-launch cleanup (dry-run default)
│   └── cleanup-e2e-users.mjs    # Remove temporary test accounts (service role)
├── supabase/
│   ├── migrations/              # 0001 schema + RLS, 0002 host isolation,
│   │                            # 0003 reg-number default, 0004 dup backstops
│   └── seed/                    # 0002_seed_events.sql (16 documented events)
├── .env.local                   # YOUR secrets (git-ignored — never commit)
└── ../frontend/                 # Stitch HTML mockups (design reference only)
```

---

## 🚀 Getting started

### 1. Install dependencies

```bash
cd colorido-2k26
npm install
```

### 2. Configure environment variables

`.env.local` already exists locally with your Supabase URL, publishable key and
service-role key. **This file is git-ignored — never commit it.**

For production (Vercel) add the same three values in
**Vercel → Project → Settings → Environment Variables**.

### 3. Apply the database schema (one time)

Run each file top-to-bottom in **Supabase Dashboard → SQL Editor → Run**:

1. `supabase/migrations/0001_initial_schema.sql` — all 13 tables, constraints,
   indexes, the registration-number sequence, **Row Level Security policies**,
   and the public `gallery` storage bucket.
2. `supabase/seed/0002_seed_events.sql` — seeds exactly the 16 documented
   events (10 cultural + 3 boys sports + 3 girls sports) plus clearly-marked
   demo announcements.
3. `supabase/migrations/0002_host_event_isolation.sql` — tightens Event Host
   visibility to published events + only their assigned events. **Applied.**
4. `supabase/migrations/0003_registration_number_default.sql` — makes
   `CLR26-000001…` auto-generate on every insert path. **⚠️ PENDING — not yet
   run on the live project** (the app currently passes the number explicitly,
   so nothing breaks without it; apply it for full hardening).
5. `supabase/migrations/0004_duplicate_backstops.sql` — race-proof unique
   indexes (one canonical participant per college+roll, one registration per
   participant per event). **⚠️ PENDING — not yet run on the live project.**
6. `supabase/migrations/0005_registration_status_policies.sql` — adds RLS
   UPDATE policies on registrations/teams (admins + assigned hosts) so status
   workflows honor RLS even on user clients. **⚠️ PENDING — recommended
   together with 0003/0004** (the app already works via service-role writes).

Sanity check any time with:

```bash
npm run verify:db           # 12-check acceptance suite (schema, seed, RLS)
npm run verify:integration  # Phase 12 FK/lifecycle audit (12 FK checks +
                            # per-event data matrix + host coverage)
```

### 4. Run the app

```bash
npm run dev          # development
# or
npm run build && npm start   # production build (what the preview uses)
```

Open http://localhost:3000 — unauthenticated visitors are redirected to
`/login` first (login-first entry, spec §4), where "ENTER FESTIVAL SITE"
grants 30-day viewer access and staff sign in with their accounts.

### 5. Create staff accounts (Admin / Event Host)

From the project folder, using the service-role key from `.env.local`:

```bash
# Create your first ADMIN account:
npm run create-user -- your-email@college.edu YourPassword123 admin

# Create an EVENT HOST and assign an event (slug from the events table):
npm run create-user -- host@college.edu HostPass123 host dance-solo
```

Sign in at http://localhost:3000/login → you land on `/admin` (admin) or
`/host` (event host) based on your database role.

### 6. Optional: demo data for every event

To see the consoles, analytics and check-in flows populated, seed clearly-
marked FAKE registrations — 2 per event (2 individuals for every individual
event incl. Dance — Solo, 2 full teams with captains/members for every team
event incl. Music & Band — Group):

```bash
npm run seed:demo          # dry run: shows the plan
npm run seed:demo -- --yes # writes 32 demo registrations (CLR26-000008+)
```

Everything demo is marked (`@demo.colorido.test` emails, `DEM…` rolls,
"DEMO …" team names) and is removed by the same pre-launch purge as the test
rows — real registrations are never touched.

### 7. Event details (venues, times, rules) and the contact page

Real campus content lives in `scripts/seed-event-details.mjs`: per-event
venue, reporting/start/end times, registration deadline, eligibility, rules,
judging criteria and two published schedule slots (Reporting + Competition),
staggered across R.V.R. & J.C. College venues. Re-runnable — re-run it after
edits:

```bash
npm run seed:details
```

The contact page (`/contact`) ships with the college address, a festival
phone, `info@rvrjc.ac.in`, and an embedded Google Map of the campus —
edit the constants at the top of `src/app/(public)/contact/page.tsx`.

> Note: the DB trigger auto-creates every new auth user as `event_host`.
> Promote an existing user to admin with:
> `update public.profiles set role='admin' where id = (select id from auth.users where email='…');`

---

## 🔑 The three Supabase keys (beginner guide)

Supabase gives every project three credentials — here is what each is for:

| Key | Where to find it | Where it's used | Secret? |
|---|---|---|---|
| **Project URL** | Dashboard → Project Settings → API | Everywhere (`NEXT_PUBLIC_SUPABASE_URL`) | No |
| **Publishable / anon key** | Dashboard → Project Settings → API | Browser + server, always limited by RLS (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) | Safe to expose |
| **service_role key** | Dashboard → Project Settings → API | **Server only**, bypasses RLS (`SUPABASE_SERVICE_ROLE_KEY`) | ⚠️ NEVER expose or commit |

---

## 🗺️ Phase roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Requirements + project setup | ✅ Done |
| 1 | Database architecture (schema, RLS, seed) | ✅ Done |
| 2 | Authentication + RBAC (login, guards, host isolation) | ✅ Done |
| 3 | Design system + shared UI | ✅ Done |
| 4 | Public website shell + **login-first entry** | ✅ Done (incl. the gate from spec §4) |
| 5 | Dynamic events (DB-driven) | ✅ Done |
| 6 | Participant registration (individual + team + duplicate block) | ✅ Done |
| 7 | Admin console (14 routes) | ✅ Done |
| 8 | Event Host console (5 routes, event-scoped) | ✅ Done |
| 9 | Schedule — console → DB → public (event column, filters, mobile scroll) | ✅ Done + E2E-verified |
| 10 | Announcements + results — console → DB → public (event links, draft/publish) | ✅ Done + E2E-verified |
| 11 | Gallery (Storage), sponsors (incl. logo upload), contacts workflow | ✅ Done + E2E-verified |
| 12 | Integration & data verification (FK audit, lifecycle E2E, auth probes) | ✅ Done |
| 13 | Security & RBAC audit (RLS probes, rate limiting, secrets scan — see `docs/PHASE13-SECURITY-AUDIT.md`) | ✅ Done |
| 14 | Responsive & UX QA (320–1440px, drawer, a11y, touch targets) | ✅ Done |
| 15 | Production deployment — prep done; execute with [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | 🔜 Ready to deploy |
| 16 | Analytics dashboard · QR entry passes + check-in scanner · email confirmations | ✅ Done + E2E-verified |

**Build status:** `tsc --noEmit` clean · `next build` green · **39 routes**
(14 public + login + 17 admin + 6 host + the public `/check-in/[id]` pass).

**Feature flows proven end-to-end (console → database → public page):**
schedule (with event column + filters), event-scoped announcements (drafts
stay private), published results (grouped, medal display), gallery (Storage
upload + category filter), sponsors (incl. logo upload to Storage), and the
contact-form → admin-inbox → status workflow.

---

## 🧭 Route map

**Public** — `/` · `/events` + `/events/[slug]` · `/registration?event=<id>`
(individual & team wizards) · `/registration/[id]` (confirmation page) ·
`/schedule` · `/results` · `/gallery` · `/sponsors` · `/announcements` ·
`/about` · `/contact`

**Staff** — `/login` (viewer gate + staff sign-in with role redirect)

**Admin console** (`/admin`, role: admin) — dashboard · **analytics** ·
events (list, new, edit, armed delete) · registrations (filters, status
workflow, **CSV export** at `/admin/registrations/export`) · participants ·
teams · schedule · announcements · results · gallery (Storage upload, MIME +
8 MB validation) · sponsors (name/website/tier/order + optional **logo
upload**, active toggle, delete with Storage cleanup) · contacts (status
workflow) · hosts (create/remove staff, assign / unassign events) ·
**check-in scanner**

**Host console** (`/host`, role: event_host) — my events · registrations ·
**check-in scanner** (with an assigned-events-only queue) · schedule ·
announcements · results — every page and action scoped to the host's assigned
events via `assertHostEvent()` **and** RLS (404 if not assigned).

**Participant pass** — `/check-in/<registration-uuid>`: the public QR entry
pass (wallet-style card). No login needed — the unguessable UUID is the
capability token, and the middleware explicitly admits `/check-in/` so the
link can be shared over WhatsApp or printed.

---

## 🔢 Registration numbers (auto-increment)

`registrations.registration_number` is generated by the database — no app code
involved. The column default calls `next_registration_number()`, which reads
the PostgreSQL sequence `registration_number_seq` and formats it as
`CLR26-000001`, `CLR26-000002`, …

- **Fully automatic** on every insert.
- **One global counter for the whole festival** (not per event): a dance-solo
  entry and a fine-arts entry made moments apart can differ by several numbers
  because other registrations were interleaved.
- Next number after the current test data is **CLR26-000008**.
- PostgreSQL sequences can skip a number if a transaction aborts — normal and
  harmless.

---

## 📊 Phase 16 — analytics, QR passes & check-in, email

**① `/admin/analytics`** — DB-driven dashboard: registration totals by
status, unique participants, team vs individual split, per-event bars (with
checked-in counts), signups-per-day chart, top colleges, and a published-
results medal table. Pure CSS charts — no chart library, no extra deps.

**② QR entry passes + check-in scanner**

- Every confirmed registration has a public pass at `/check-in/<uuid>`:
  wallet-style card with a server-rendered QR (SVG), the registration
  number in plain text, event/date/venue details, and a status banner that
  flips to **"Checked in"** after the pass is used.
- The QR encodes the pass URL itself. Scanners accept the camera scan, a
  pasted URL, or a bare UUID — USB/Bluetooth "keyboard-wedge" scanners just
  work in the code box.
- Staff scan at `/admin/check-in` (festival-wide stats + scanner) and
  `/host/check-in` (same scanner plus an "awaiting entry" queue limited to
  the host's assigned events).
- `src/lib/qr.ts` is a **zero-dependency QR encoder** (byte mode, EC level
  M, versions 2–6, ISO/IEC 18004). Correctness is *proven*, not assumed:
  `npm run verify:qr` decodes its output with the independent `jsqr` decoder
  AND asserts bit-for-bit matrix equality against the `qrcode` reference
  encoder for every version (11 checks, all passing).
- Check-in rules: only `confirmed` registrations can check in; the action is
  idempotent ("Already checked in."); hosts are refused passes from events
  they are not assigned to.

**③ Email confirmations** (`src/lib/email.ts` + `src/lib/email-notifications.ts`)

- Registration confirmation (with the pass link) is sent right after a
  successful registration; approve / reject / cancel decisions email the
  participant — only when the status actually changed.
- Uses Resend's REST API directly. **Without `RESEND_API_KEY` the email
  layer silently no-ops** (logged, never sent) — dev, preview and E2E flows
  are unaffected. Send failures never break a registration.
- Optional env vars (see `.env.example`): `RESEND_API_KEY`, `EMAIL_FROM`,
  `NEXT_PUBLIC_APP_URL` (used for pass/detail links in emails).

---

## 🔒 Security model

- **Login-first entry (spec §4):** `src/middleware.ts` redirects every
  unauthenticated non-static path to `/login?next=<deepLink>`. The
  "ENTER FESTIVAL SITE" action sets a 30-day `clr_viewer` cookie and returns
  the visitor to their deep link (same-site paths only). The viewer cookie
  never opens `/admin` or `/host`.
- **All tables have Row Level Security** with least-privilege policies
  (migrations 0001 + 0002). Anon keys can read published festival data and
  create registrations/contact messages — nothing else.
- **Consoles read via the service-role client only after the `requireRole()`
  gate** in the server component/action (RLS blocks anon-key staff reads, so
  the trusted server fetches after the role check).
- **Registration writes** use the service-role client because anon sessions
  can INSERT participants but cannot read them back.
- **`/registration/[id]` confirmation** uses the unguessable registration UUID
  as a capability token (service-role read).
- **Host isolation is double-enforced:** server-side `assertHostEvent()` (404)
  plus RLS policies on every host-managed table. Hosts can only ever create
  event-scoped announcements.
- **Verified by probes (Phase 12):** anon-key REST reads return `[]` on
  registrations/profiles, anon UPDATE attempts change nothing, unauthenticated
  `/admin` + `/host` requests redirect to `/login` (307), and every
  registration status change is visible across both consoles.
- **Phase 13 attack probes all fail safely:** a host JWT cannot read other
  hosts' profiles (self-only policy), cannot update/insert/delete rows of
  unassigned events (silent no-op or `42501` RLS violation), anon Storage
  uploads are rejected (`403 AccessDenied`), oversized/garbage payloads are
  rejected by Zod + DB constraints (`23514`), tampered session cookies cannot
  open consoles, and `next=//evil.com` open-redirects are sanitized.
- **No secrets in the client bundle:** `.next/static` contains no
  service-role key or non-public env vars (verified by build scan).
- **Rate limiting (Phase 13):** public server actions are throttled per IP —
  contact 8/15 min, registration 30/h (campus-NAT generous), staff login
  10/5 min (`src/lib/rate-limit.ts`; swap the Map for Redis on multi-instance
  hosting).
- **Check-in passes & scanning (Phase 16):** `/check-in/<uuid>` is public by
  design (capability-token URL, same trust model as `/registration/[id]`) —
  it exposes exactly one registration's display fields. The check-in action
  requires a staff session; hosts are scope-checked per event inline (no
  `notFound()` throws inside actions), and the write still goes through the
  service-role client only after the gates. Email helpers are
  fire-and-forget: they resolve context server-side and never leak errors
  into the user flow.
- **Responsive & a11y (Phase 14):** no page overflow at 320/375/425/768/1440px
  (wide tables scroll inside `overflow-x-auto` wrappers), mobile drawer nav
  works, registration wizard inputs are ≥42px touch targets, status selects
  are `aria-label`-ed, sign-out clears session + viewer cookie.
- **Full audit report:** [`docs/PHASE13-SECURITY-AUDIT.md`](docs/PHASE13-SECURITY-AUDIT.md)
  — 17-probe evidence table, per-action guard matrix (35/35 actions guarded),
  rate-limit rationale, and the secrets-scan result.
- The service-role key is used **only** in server code
  (`src/lib/supabase/admin.ts`) and throws when missing. `.env*` files are
  git-ignored.

---

## 🧹 Before production (data cleanup)

The live project currently contains clearly-identified test **and demo**
data that should be removed before the festival goes live:

- Test registrations `CLR26-000003`, `CLR26-000006` (individual, dance-solo /
  fine-arts) and `CLR26-000007` (team "Nova Beats", music-band-group) plus
  their test participants.
- All 32 demo registrations from `npm run seed:demo`
  (`@demo.colorido.test` participants, DEM… rolls, "DEMO …" teams).
- One command removes everything: `npm run purge:test-data`
  (dry-run first, `--yes` to execute) — real registrations never match.
- All temporary E2E staff accounts were already removed
  (`npm run cleanup:e2e-users`).
- Demo/seed announcements are clearly marked and should be reviewed before
  production.
- Optionally reset the counter so the festival starts at `CLR26-000001`:
  `truncate registration_number_seq restart with 1;` after deleting the test
  registrations.
- All pre-launch cleanup is scripted and guarded: see
  [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — `npm run purge:test-data`
  (dry-run first, `--yes` to execute).

## 📌 Data policy

- Only the **16 documented events** exist. No technical/departmental events
  will ever be added.
- Event venues/times/rules are campus content defined in
  `scripts/seed-event-details.mjs` (re-run after edits); anything not yet
  entered still displays as **"To be announced"**.
- The festival phone number on `/contact` is a placeholder — replace it with
  the official number before go-live.
- Demo/seed announcements, `seed:demo` registrations and the E2E test rows
  are clearly marked and must be purged before production
  (`npm run purge:test-data`).
