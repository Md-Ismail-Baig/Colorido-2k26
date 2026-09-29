# COLORIDO 2K26 — Preview Run Doc

Next.js 16 app (`colorido-2k26/`) backed by Supabase (live remote project). The
preview server runs a **production build** on port **3100**.

## How to reproduce the artifacts (fresh checkout)

1. **Install dependencies** (from `colorido-2k26/`):
   ```
   npm install
   ```
2. **Environment variables**: copy `.env.local` from the main checkout into
   `colorido-2k26/.env.local`. It must define:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only secret — NEVER commit)
3. **Database**: migrations 0001–0002 are applied to the live Supabase project
   (0003 registration-number default and 0004 unique backstops exist in the repo
   but are PENDING user application). For a NEW project, paste each file from
   `colorido-2k26/supabase/migrations/` (in numeric order) **and**
   `supabase/seed/0002_seed_events.sql` into Supabase Dashboard → SQL Editor → Run.
4. **Build**:
   ```
   npm run build
   ```

## How to run the server (Windows, detached)

```
powershell -NoProfile -Command "(Start-Process -FilePath 'node.exe' -ArgumentList 'node_modules\next\dist\bin\next','start','-p','3100' -WorkingDirectory '<ABSOLUTE PATH>\colorido-2k26' -RedirectStandardOutput '<LOG>.out' -RedirectStandardError '<LOG>.err' -WindowStyle Hidden -PassThru).Id"
```

- stdout and stderr MUST go to different files (PowerShell requirement).
- Verify: `netstat -ano | findstr :3100` shows LISTENING, then
  `curl http://localhost:3100/` returns 200.
- Stop: `powershell -NoProfile -Command "Stop-Process -Id <PID> -Force"`.

## Verification commands

- `npm run verify:db` — 12-check database acceptance suite (schema, seed, RLS)
- `npx tsc --noEmit` — typecheck
- Live smoke test: open `/` (public site), `/registration?event=<id>` (wizard),
  `/login` (staff). `/admin` + `/host` redirect to login when signed out.

## Known quirks

- Windows `Start-Process` launch from bash may time out the shell even though
  the process started — always confirm via `netstat` afterwards.
- Preview tabs occasionally navigate themselves to `/contact`; re-navigate to
  the target URL before driving forms.
