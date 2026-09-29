-- ============================================================================
-- COLORIDO 2K26 — Migration 0003: auto-generate registration numbers
--
-- The registrations table required registration_number but nothing populated
-- it (INSERTs without an explicit value failed with a not-null violation).
-- This wires the existing next_registration_number() sequence helper as the
-- column default, so CLR26-000001… is assigned on every insert path.
--
-- Apply via Supabase SQL Editor (see README).
-- ============================================================================

alter table public.registrations
  alter column registration_number set default public.next_registration_number();
