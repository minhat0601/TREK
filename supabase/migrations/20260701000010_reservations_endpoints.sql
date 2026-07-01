-- =============================================================================
-- Migration 0010: Add endpoints + transport metadata columns to reservations
-- The TransportModal and flight booking features store structured from/to
-- endpoints as a JSONB array with role, location, sequence, date, time fields.
-- =============================================================================

alter table public.reservations
  add column if not exists endpoints    jsonb    default '[]'::jsonb,
  add column if not exists metadata     jsonb    default '{}'::jsonb,
  add column if not exists flight_number text,
  add column if not exists carrier      text,
  add column if not exists seat         text,
  add column if not exists booking_ref  text;

-- Index for endpoint-based queries (transport routes)
create index if not exists idx_reservations_endpoints
  on public.reservations using gin(endpoints)
  where endpoints is not null and jsonb_array_length(endpoints) > 0;
