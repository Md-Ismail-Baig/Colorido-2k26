# COLORIDO 2K26 — Deployment Guide (Phase 15)

The app is production-ready. This guide takes the current working copy to a
live Vercel URL in ~15 minutes, then covers the pre-launch data cleanup.

---

## 0. Prerequisites (one-time, before deploying)

1. **Apply the pending migrations** in Supabase Dashboard → SQL Editor → Run,
   in order (each file is idempotent):
   - `supabase/migrations/0003_registration_number_default.sql`
   - `supabase/migrations/0004_duplicate_backstops.sql`
   - `supabase/migrations/0005_registration_status_policies.sql`
2. **Verify your accounts work**: sign in at `/login` with
   `you@college.edu` → should land on `/admin`.

---

## 1. Commit and push the current work

All Phase 9–14 changes are currently uncommitted. From `colorido-2k26/`:

```bash
git add -A
git commit -m "Phases 9-14: feature E2E verification, integration audit, security hardening, responsive QA"
git push origin main
```

(The repo already has a remote: `github.com/pabbasaipavan123-alt/colorido`.)

## 2. Create the Vercel project (~5 minutes)

1. Go to **vercel.com** → sign in **with GitHub** (same account as the repo).
2. **Add New… → Project** → find `colorido` in the repository list → **Import**.
3. Configure the project:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** click **Edit** → select `colorido-2k26`
     (the app lives in a subfolder of the repo)
   - Build/install commands: leave as defaults
4. Open **Environment Variables** and add the three required entries
   (values come from `colorido-2k26/.env.local` — never commit them):

   | Name | Value | Environments |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://sqvajosxlxztzqwpvjfs.supabase.co` | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your publishable key (`sb_publishable_…` or the legacy anon JWT) | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service-role key — **secret** | Production, Preview, Development |

   **Phase 16 (optional) — email + pass links:**

   | Name | Value | Environments |
   |---|---|---|
   | `RESEND_API_KEY` | from resend.com → API Keys (omit = emails skipped gracefully) | Production |
   | `EMAIL_FROM` | `COLORIDO 2K26 <noreply@your-verified-domain.edu>` | Production |
   | `NEXT_PUBLIC_APP_URL` | your final site URL (used in email links) | Production |

5. Click **Deploy**. First build takes ~2 minutes.

## 3. Allow Vercel to call Supabase (one-time)

Supabase projects with fresh API keys may need Vercel's IPs allowed, or simply
leave network access open for launch. If the deployed site shows database
errors, check **Supabase Dashboard → Project Settings → API → Network
Restrictions** and allow Vercel / public access.

## 4. Post-deploy verification checklist

Open the deployed URL and confirm:

- [ ] `/` redirects to `/login` (login-first gate works on the domain)
- [ ] "ENTER FESTIVAL SITE" → home renders with 16 events from the DB
- [ ] `/events/dance-solo` loads (dynamic event route works)
- [ ] Sign in as `you@college.edu` → `/admin` loads with live stats
- [ ] Sign in as `host@college.edu` → `/host` shows only Dance — Solo
- [ ] Register a real test participant on any event → confirmation page shows
      a `CLR26-…` number
- [ ] That registration appears in `/admin/registrations` (CSV export works)
- [ ] Contact form submits and appears in `/admin/contacts`

If any step fails, check **Vercel → Deployments → Runtime Logs** and the
three environment variables first.

## 5. Pre-launch data cleanup (before real participants register)

The live project still contains development test data. Clean it in this order:

1. **Purge the 3 test registrations + participants** (dry-run first, then
   execute):

   ```bash
   npm run purge:test-data          # lists what will be deleted
   npm run purge:test-data -- --yes # executes
   ```

2. **Reset the counter** so the festival starts at `CLR26-000001` (only after
   the registrations table is empty) — Supabase SQL Editor:

   ```sql
   truncate registration_number_seq restart with 1;
   ```

3. **Review demo announcements** in `/admin/announcements` — delete or edit
   the two seeded "Registration Opens Soon" / "Festival Date Confirmed" rows
   if you don't want them live.

4. **Supabase Auth → remove any leftover test users** (only
   `you@college.edu` and `host@college.edu` should remain).

## 6. Optional production hardening

- **Custom domain**: Vercel → Project → Settings → Domains.
- **Supabase custom domain** for Storage URLs (else gallery images point at
  `*.supabase.co` — fine, just less branded).
- **Rate limiter upgrade**: on multi-instance/serverless hosting, swap the
  in-memory Map in `src/lib/rate-limit.ts` for Upstash Redis (call sites
  unchanged).
- **Backups**: Supabase → Database → Backups (paid tiers) or a scheduled
  `pg_dump`.

---

## Current status snapshot (2026-09-29)

| Item | State |
|---|---|
| Build | `tsc` clean · `next build` green · 35 routes |
| Phases 0–14 | ✅ complete (see README roadmap) |
| Migrations 0003/0004/0005 | ⚠️ pending — apply in SQL Editor |
| Staff accounts | ✅ `you@college.edu` (admin) · `host@college.edu` (host → Dance—Solo) |
| Test data | 3 registrations (CLR26-000003/6/7) — purge before launch |
| Security audit | ✅ PASS — `docs/PHASE13-SECURITY-AUDIT.md` |
