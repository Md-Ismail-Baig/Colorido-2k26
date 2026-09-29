# COLORIDO 2K26 — Cultural & Sports Festival Platform

A real, database-driven event-management platform for the COLORIDO 2K26
Cultural & Sports Festival (28 December 2026).

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase
(PostgreSQL + Auth + Storage + RLS) · React Hook Form + Zod · Vercel

---

## 📁 Project structure

```
colorido-2k26/
├── src/
│   ├── app/                 # Routes (App Router)
│   ├── components/          # Reusable UI (added in later phases)
│   ├── lib/
│   │   ├── supabase/        # client / server / admin Supabase clients
│   │   └── validations/     # Zod schemas (shared client + server)
│   ├── types/               # Central data model (mirrors the DB schema)
│   └── ...
├── supabase/
│   ├── migrations/          # 0001_initial_schema.sql (full schema + RLS)
│   └── seed/                # 0002_seed_events.sql (16 documented events)
├── .env.local               # YOUR secrets (never committed)
└── frontend/                # Stitch HTML mockups (design reference only)
```

---

## 🚀 Getting started

### 1. Install dependencies

```bash
cd colorido-2k26
npm install
```

### 2. Configure environment variables

`.env.local` already exists locally with your Supabase URL and publishable
key. **This file is git-ignored — never commit it.**

For production (Vercel) you will later add the same values in
**Vercel → Project → Settings → Environment Variables**.

### 3. Apply the database schema (one time)

1. Open https://supabase.com/dashboard and select your project
   (`sqvajosxlxztzqwpvjfs`).
2. In the left sidebar, click **SQL Editor** → **New query**.
3. Open `supabase/migrations/0001_initial_schema.sql` from this repo,
   copy **the entire file**, paste it into the SQL editor, and click **Run**.
   - This creates all 12 core entities, constraints, indexes, the
     registration-number sequence, **Row Level Security policies**, and the
     public `gallery` storage bucket.
4. In a **new** SQL editor query, do the same with
   `supabase/seed/0002_seed_events.sql` and click **Run**.
   - This seeds exactly the 16 documented events (10 cultural + 6 sports)
     plus a few clearly-marked demo announcements.
5. Run `supabase/migrations/0002_host_event_isolation.sql` the same way.
   - Tightens Event Host visibility: hosts see published events + only their
     assigned events (any status). Required before Phase 2 sign-off.
6. Run `supabase/migrations/0003_registration_number_default.sql` the same way.
   - Makes `CLR26-000001…` auto-generate on every insert path.
7. Run `supabase/migrations/0004_duplicate_backstops.sql` the same way.
   - Race-proof unique indexes for duplicate-prevention (spec §18):
     one canonical participant per college+roll, one registration per
     participant per event.

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000 — the verification page will confirm the
Supabase connection and show how many events were seeded (expect 16).

### 5. Create staff accounts (Admin / Event Host)

From the project folder, using the service-role key from `.env.local`:

```bash
# Create your first ADMIN account:
npm run create-user -- your-email@college.edu YourPassword123 admin

# Create an EVENT HOST and assign an event (slug from the events table):
npm run create-user -- host@college.edu HostPass123 host dance-solo
```

Then sign in at http://localhost:3000/login → you'll be redirected to
`/admin` (admin) or `/host` (event host) based on your database role.

---

## 🔑 The three Supabase keys (beginner guide)

Supabase gives every project three credentials — here is what each is for:

| Key | Where to find it | Where it's used | Secret? |
|---|---|---|---|
| **Project URL** | Dashboard → Project Settings → API | Everywhere (`NEXT_PUBLIC_SUPABASE_URL`) | No |
| **Publishable / anon key** | Dashboard → Project Settings → API | Browser + server, always limited by RLS (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) | Safe to expose |
| **service_role key** | Dashboard → Project Settings → API | **Server only**, bypasses RLS (`SUPABASE_SERVICE_ROLE_KEY`) | ⚠️ NEVER expose or commit |

`service_role` is required from Phase 2 onward (admin operations). Paste it
into `.env.local` when you reach that phase — never into any client code.

---

## 🗺️ Phase roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Requirements + project setup | ✅ Done |
| 1 | Database architecture (schema, RLS, seed) | ✅ Done |
| 2 | Authentication + RBAC (login, guards, host isolation) | ✅ Done — apply `0002_host_event_isolation.sql` |
| 3 | Design system + shared UI | 🔜 Next |
| 4 | Public website shell | 🔜 |
| 5 | Dynamic events (DB-driven) | 🔜 |
| 6 | Participant registration | 🔜 |
| 7 | Admin dashboard | 🔜 |
| 8 | Event Host dashboard | 🔜 |
| 9–11 | Schedule, announcements, results, gallery, sponsors, contact | 🔜 |
| 12–14 | Integration, security audit, responsive QA | 🔜 |
| 15 | Production deployment (Vercel) | 🔜 |

---

## 🔒 Data policy

- Only the **16 documented events** exist. No technical/departmental events
  will ever be added.
- Information not officially provided (venue, deadlines, contact details,
  sponsors…) is stored as empty and displayed as **"To be announced"** —
  never fabricated.
- Demo/seed data is clearly marked and must be removed before production.

## 🛡️ Security notes

- All tables have **Row Level Security** enabled with least-privilege
  policies (see migration `0001`).
- The service-role key is used **only** in server code
  (`src/lib/supabase/admin.ts`) and throws when missing.
- `.env*` files are git-ignored.
