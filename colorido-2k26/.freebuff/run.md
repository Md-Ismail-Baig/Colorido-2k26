# Run doc — COLORIDO 2K26 (Next.js 16 dev server)

## 1. Reproduce uncommitted artifacts (fresh checkout)

This workspace is the primary checkout, so most artifacts are already present.
For a genuinely fresh clone:

1. **Environment** — copy `.env.local` from the main checkout
   (`C:\Users\Hi\Colorido-2k26\colorido-2k26\.env.local`). It must contain:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `SUPABASE_SERVICE_ROLE_KEY`.
   Never commit or paste secret values here — copy the file itself.
2. **Dependencies** — `npm install` (package-lock.json is committed; npm is
   the project's package manager).
3. **Database content** — the app reads live data from Supabase. The 16
   events come from `supabase/seed/0002_seed_events.sql` (already applied to
   the shared Supabase project). Event banner images + gallery photos are
   seeded with `npm run seed:images -- --yes` (idempotent; reads
   `public/images/colorido/` which is committed).
4. **Optional verification** — `npm run verify:db`, `npm run
   verify:integration`, `npm run verify:qr` (all green as of last check).

## 2. Run the server

- Command: `npm run dev` (Next.js 16, Turbopack).
- Default port: **3000** (`next dev` default). If 3000 is taken (or another
  dev server for this directory is already running — Next 16 enforces a
  **single dev server per directory** and a second start exits with
  "existing server" in stderr), Next picks a random free port — check the log
  line `Local: http://localhost:<port>` and use that URL.

**CURRENT LIVE INSTANCE** (as of 2026-09-30): detached `npm run dev` on
**http://localhost:55080**, npm wrapper pid from Start-Process spawned node
pid **6572** (`netstat -ano | grep :55080` to re-find it). Logs:
`.freebuff/dev-server.log` + `.freebuff/dev-server.log.err`. Health probe:
`curl -m 10 -o NUL -w "%{http_code}" http://localhost:55080/login` (expect 200).
- Detached start (Windows, from the project root):

  ```
  powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
  ```

  stdout and stderr must go to different files. Confirm with
  `powershell -NoProfile -Command "Get-Process -Id <pid>"`, then poll the
  URL until it answers before registering the preview.

- Production-equivalent check (optional): `npm run build` then `npm start`.
- Stop: kill the node pid (`taskkill //PID <pid> //F`; find it via
  `netstat -ano | grep :<port>`).

## 3. Preview

- Preview tab uses the live instance above: `http://localhost:55080`.
- Entry flow note: the app is login-first — `/` and all public pages
  307-redirect to `/login` until "Enter Fest Site" sets the `clr_viewer`
  session cookie. The Preview tab will show the login page first; that is
  correct behavior, not an error.
