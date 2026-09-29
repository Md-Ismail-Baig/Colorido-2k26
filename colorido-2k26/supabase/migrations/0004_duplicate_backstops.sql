-- ============================================================================
-- COLORIDO 2K26 — Migration 0004: duplicate-prevention database backstops
--
-- Spec §18: duplicate registration prevention is a DATABASE + SERVER concern.
-- The server action resolves each student to ONE canonical participant row
-- (college + roll_number, or email per event policy) and checks registrations
-- against it. These unique indexes make that guarantee hold even under
-- concurrent submissions (race condition backstop):
--
--   1. participants: one canonical row per (college, roll_number), case-insensitive
--   2. registrations: one registration per (event, participant)
--
-- Safety: each index creation first checks for existing duplicates and fails
-- with a clear message instead of a cryptic unique-violation.
--
-- Apply via Supabase SQL Editor (see README).
-- ============================================================================

do $$
begin
  if exists (
    select 1 from public.participants
    group by lower(trim(college)), lower(trim(roll_number))
    having count(*) > 1
  ) then
    raise exception 'Duplicate participants found (same college + roll number). Deduplicate participants before applying migration 0004.';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from public.registrations
    group by event_id, participant_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate registrations found (same event + participant). Deduplicate registrations before applying migration 0004.';
  end if;
end $$;

create unique index uq_participants_college_roll
  on public.participants (lower(trim(college)), lower(trim(roll_number)));

create unique index uq_registrations_event_participant
  on public.registrations (event_id, participant_id);
