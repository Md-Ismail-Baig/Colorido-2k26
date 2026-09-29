-- ============================================================================
-- COLORIDO 2K26 — Migration 0002: tighten Event Host event access
--
-- Before: any authenticated staff could SELECT all events (incl. drafts).
-- After:  hosts see published events (public info) + their ASSIGNED events
--         (any status). Draft/unassigned events are invisible to hosts.
-- Admins keep full access. Apply via Supabase SQL Editor (see README).
-- ============================================================================

drop policy if exists "events staff read" on public.events;

create policy "events staff scoped read" on public.events
  for select using (
    public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'event_host'
      and (
        (status = 'published' and is_active)
        or exists (
          select 1 from public.event_host_assignments a
          where a.event_id = events.id and a.host_id = auth.uid()
        )
      )
    )
  );
