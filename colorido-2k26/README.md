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
│   ├── create-user.mjs          # Create admin/host staff accounts
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

Sanity check any time with:

```bash
npm run verify:db    # 12-check acceptance suite (schema, seed, RLS)
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
| 9–11 | Schedule / announcements / results / gallery / sponsors / contact | ✅ Done (built inside the consoles + public pages) |
| 12–14 | Integration hardening, security audit, responsive QA | 🔜 Remaining |
| 15 | Production deployment (Vercel) | 🔜 Remaining |

**Build status:** `tsc --noEmit` clean · `next build` green · **35 routes**
(16 public + login + 14 admin + 5 host incl. the CSV export route).

---

## 🧭 Route map

**Public** — `/` · `/events` + `/events/[slug]` · `/registration?event=<id>`
(individual & team wizards) · `/registration/[id]` (confirmation page) ·
`/schedule` · `/results` · `/gallery` · `/sponsors` · `/announcements` ·
`/about` · `/contact`

**Staff** — `/login` (viewer gate + staff sign-in with role redirect)

**Admin console** (`/admin`, role: admin) — dashboard · events (list, new,
edit, armed delete) · registrations (filters, status workflow, **CSV export**
at `/admin/registrations/export`) · participants · teams · schedule ·
announcements · results · gallery (Storage upload, MIME + 8 MB validation) ·
sponsors · contacts (status workflow) · hosts (create/remove staff, assign /
unassign events)

**Host console** (`/host`, role: event_host) — my events · registrations ·
schedule · announcements · results — every page and action scoped to the
host's assigned events via `assertHostEvent()` **and** RLS (404 if not
assigned).

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
- The service-role key is used **only** in server code
  (`src/lib/supabase/admin.ts`) and throws when missing. `.env*` files are
  git-ignored.

---

## 🧹 Before production (data cleanup)

The live project currently contains clearly-identified test data that should
be removed before the festival goes live:

- Test registrations `CLR26-000003`, `CLR26-000006` (individual, dance-solo /
  fine-arts) and `CLR26-000007` (team "Nova Beats", music-band-group) plus
  their test participants.
- All temporary E2E staff accounts were already removed
  (`scripts/cleanup-e2e-users.mjs`); the project currently has **zero** staff
  users — create your real admin with `npm run create-user` (see above).
- Optionally reset the counter so the festival starts at `CLR26-000001`:
  `truncate registration_number_seq restart with 1;` after deleting the test
  registrations.

## 📌 Data policy

- Only the **16 documented events** exist. No technical/departmental events
  will ever be added.
- Information not officially provided (venue, deadlines, contact details,
  sponsors…) is stored as empty and displayed as **"To be announced"** —
  never fabricated.
- Demo/seed announcements are clearly marked and must be removed before
  production.
