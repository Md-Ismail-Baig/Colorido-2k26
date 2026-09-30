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
- Default port: **3000** (`next dev` default). If 3000 is taken, Next picks a
  random free port — check the log line `Local: http://localhost:<port>` and
  use that URL.
- Detached start (Windows, from the project root):

  ```
  powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
  ```

  stdout and stderr must go to different files. Confirm with
  `powershell -NoProfile -Command "Get-Process -Id <pid>"`, then poll the
  URL until it answers before registering the preview.

- Production-equivalent check (optional): `npm run build` then `npm start`.
- Stop: kill the printed pid (`taskkill //PID <pid> //F`).
