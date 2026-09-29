# Phase 13 — Security & RBAC Audit (COLORIDO 2K26)

**Status: PASS — all unauthorized test cases fail safely.**
Verified against the live Supabase project and the production build using raw
HTTP probes with real JWTs (not UI visibility). Evidence below is from the
actual probe runs of 2026-09-29.

---

## 1. Server-action guard matrix

All 11 `"use server"` files enumerated; **every exported action** carries its
own guard (verified per-function, counts match exactly — 28/28 admin, 7/7 host):

| Action file | Actions | Guard |
|---|---|---|
| `src/app/(public)/contact/actions.ts` | 1 | `allow("contact")` rate limit |
| `src/app/(public)/registration/actions.ts` | 1 | `allow("registration")` rate limit |
| `src/app/admin/announcements/actions.ts` | 4 | `requireRole("admin")` |
| `src/app/admin/events/actions.ts` | 4 | `requireRole("admin")` |
| `src/app/admin/gallery/actions.ts` | 7 | `requireRole("admin")` |
| `src/app/admin/hosts/actions.ts` | 4 | `requireRole("admin")` |
| `src/app/admin/registrations/actions.ts` | 2 | `requireRole("admin")` |
| `src/app/admin/results/actions.ts` | 4 | `requireRole("admin")` |
| `src/app/admin/schedule/actions.ts` | 3 | `requireRole("admin")` |
| `src/app/host/actions.ts` | 7 | `requireRole("event_host")` + `assertHostEvent()` per event |
| `src/lib/auth/actions.ts` | 3 | `allow("login")` on sign-in; viewer cookie path sanitized |

Every console **page** also calls `requireRole` in its server component
(audit found 0 unguarded routes under `/admin` + `/host`, including the CSV
export route).

## 2. Route fences (middleware)

- Matcher covers everything except Next internals/static files.
- `/admin/**` and `/host/**` require a **server-validated** session —
  `supabase.auth.getUser()` (token verified with the Supabase server, never
  trusting raw cookie data).
- Login-first gate redirects all other paths to `/login?next=<deepLink>` for
  anonymous visitors without the viewer cookie.
- `/login` redirects authenticated staff to their role dashboard.

## 3. Attack probes — evidence

Probes used the anon key and a **real host JWT** (password grant) against the
live REST API:

| # | Probe | Expected | Actual result |
|---|---|---|---|
| 1 | Host JWT SELECTs registrations (own event) | own-event rows only | ✅ saw only `CLR26-000003` (dance-solo) |
| 2 | Host JWT SELECTs `profiles` | self row only | ✅ exactly 1 row (own id) with 2 profiles in DB |
| 3 | Host JWT UPDATEs another event's registrations | blocked | ✅ `[]` — silent RLS no-op |
| 4 | Host JWT INSERTs schedule for unassigned event | blocked | ✅ `42501 new row violates row-level security policy` |
| 5 | Host JWT DELETEs another event's results | blocked | ✅ HTTP 204, zero rows removed |
| 6 | Anon INSERT announcement | blocked | ✅ `42501` RLS violation |
| 7 | Anon INSERT result | blocked | ✅ `42501` RLS violation |
| 8 | Anon UPDATE announcement | blocked | ✅ 204 no-op; published count unchanged (verified) |
| 9 | Anon DELETE event row | blocked | ✅ 204 no-op; `dance-solo` still intact (verified) |
| 10 | Anon SELECT registrations / profiles | `[]` | ✅ `[]` |
| 11 | Anon Storage upload to `gallery` bucket | blocked | ✅ `403 AccessDenied` ("violates row-level security") |
| 12 | Contact message 6000 chars | rejected | ✅ `23514 contact_messages_message_check` |
| 13 | Registration insert with bogus status | rejected | ✅ `23514 registrations_status_check` |
| 14 | Garbage/tampered session cookie → `/admin` | redirect | ✅ `307 → /login` |
| 15 | Viewer cookie alone → `/admin` | redirect | ✅ `307 → /login` (viewer never opens consoles) |
| 16 | `/login?next=//evil.example.com` | sanitized | ✅ 200; redirect target validated same-site in `enterAsViewer` |
| 17 | Sign-out via UI | full teardown | ✅ session + `clr_viewer` cookie deleted; `/admin` fenced again |

## 4. Secrets exposure

- `.next/static` (client bundles) scanned: **no `SUPABASE_SERVICE_ROLE_KEY`,
  no `sb_secret_*`, no non-public env values**.
- Only `NEXT_PUBLIC_*` values ship to the browser (URL + publishable key),
  which are designed to be public and remain constrained by RLS.
- Service-role key used exclusively in `src/lib/supabase/admin.ts`, which
  throws when the env var is missing; `.env*` files are git-ignored.

## 5. Rate limiting (added this phase)

`src/lib/rate-limit.ts` — in-memory sliding window keyed by IP:

| Bucket | Limit | Rationale |
|---|---|---|
| `contact` | 8 / 15 min | public form abuse |
| `registration` | 30 / hour | campus NAT: many students share one IP |
| `login` | 10 / 5 min | staff sign-in brute-force guard |

Wired into `submitContactMessage`, `confirmRegistration`, `signInStaff`.
Single-process deployment today; swap the Map for Redis when moving to
multi-instance hosting (call sites unchanged).

## 6. File uploads

- Admin gallery + sponsor logos: MIME allow-list (JPG/PNG/WebP/GIF) + 8 MB
  cap validated **server-side before** hitting Storage; row insert failure
  rolls back the storage object; delete removes the object.
- Storage RLS: public **read-only** on the `gallery` bucket; write restricted
  to authenticated staff (`to authenticated` + role checks).

## 7. Conclusion

- ✅ All unauthorized test cases fail safely.
- ✅ RLS blocks direct unauthorized access (verified with raw REST + real JWTs).
- ✅ No privileged secret appears in the client bundle.
- ✅ Role boundaries demonstrably enforced at middleware → server component →
  server action → RLS, four independent layers.
