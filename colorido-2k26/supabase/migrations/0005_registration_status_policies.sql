-- ============================================================================
-- 0005_registration_status_policies.sql
--
-- Phase 12 finding: public.registrations had INSERT + SELECT policies but no
-- UPDATE policy, so status changes (confirm / reject / check-in) made through
-- a user (anon-authenticated) client were silently blocked by RLS. The app
-- already gates every write behind requireRole() + host-assignment checks and
-- writes via the service-role client, but these policies restore defense in
-- depth so user-client writes honor the authorization model too.
--
-- Safe to re-run (idempotent drop-if-exists + create).
-- ============================================================================

-- Admins may update any registration (status workflow, check-in).
drop policy if exists "registrations admin update" on public.registrations;
create policy "registrations admin update"
  on public.registrations
  for update
  using (public.current_user_role() = 'admin');

-- Hosts may update registrations belonging to their assigned events only.
drop policy if exists "registrations host update assigned" on public.registrations;
create policy "registrations host update assigned"
  on public.registrations
  for update
  using (
    exists (
      select 1
      from public.event_host_assignments a
      where a.event_id = registrations.event_id
        and a.host_id = auth.uid()
    )
  );

-- Consistent with the READ model: hosts also see status of their events' teams.
drop policy if exists "teams host update assigned" on public.teams;
create policy "teams host update assigned"
  on public.teams
  for update
  using (
    exists (
      select 1
      from public.registrations r
      join public.event_host_assignments a on a.event_id = r.event_id
      where r.id = teams.registration_id
        and a.host_id = auth.uid()
    )
  );
