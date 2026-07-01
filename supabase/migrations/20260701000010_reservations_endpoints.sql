-- =============================================================================
-- Migration 0010: Add missing columns to reservations and day_assignments
-- =============================================================================

-- ── reservations: endpoints + transport metadata ──────────────────────────────
alter table public.reservations
  add column if not exists endpoints    jsonb    default '[]'::jsonb,
  add column if not exists metadata     jsonb    default '{}'::jsonb,
  add column if not exists flight_number text,
  add column if not exists carrier      text,
  add column if not exists seat         text,
  add column if not exists booking_ref  text;

create index if not exists idx_reservations_endpoints
  on public.reservations using gin(endpoints)
  where endpoints is not null and jsonb_array_length(endpoints) > 0;

-- ── day_assignments: place_time / end_time for scheduled visits ────────────── 
alter table public.day_assignments
  add column if not exists place_time   time,
  add column if not exists end_time     time;
