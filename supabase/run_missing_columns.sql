-- =============================================================================
-- STANDALONE SQL — Run in Supabase SQL Editor to add ALL missing columns
-- Copy-paste this entire block and click "Run"
-- Safe to run multiple times (uses IF NOT EXISTS everywhere)
-- =============================================================================

-- 1. RESERVATIONS
alter table public.reservations
  add column if not exists endpoints           jsonb    default '[]'::jsonb,
  add column if not exists metadata            jsonb    default '{}'::jsonb,
  add column if not exists flight_number       text,
  add column if not exists carrier             text,
  add column if not exists seat                text,
  add column if not exists booking_ref         text,
  add column if not exists needs_review        boolean  default false,
  add column if not exists day_plan_position   double precision,
  add column if not exists day_positions       jsonb    default '{}'::jsonb,
  add column if not exists external_source          text,
  add column if not exists external_id              text,
  add column if not exists external_owner_user_id   uuid references auth.users on delete set null,
  add column if not exists external_synced_at       timestamp with time zone,
  add column if not exists sync_enabled             boolean default false;

create index if not exists idx_reservations_endpoints
  on public.reservations using gin(endpoints)
  where endpoints is not null and jsonb_array_length(endpoints) > 0;

create index if not exists idx_reservations_external
  on public.reservations(external_source, external_id)
  where external_source is not null;

-- 2. DAY_ASSIGNMENTS
alter table public.day_assignments
  add column if not exists place_time   time,
  add column if not exists end_time     time;

-- 3. PLACES — route geometry
alter table public.places
  add column if not exists route_geometry text;

-- 4. BUDGET_ITEMS
alter table public.budget_items
  add column if not exists currency        text,
  add column if not exists exchange_rate   double precision default 1.0,
  add column if not exists expense_date    date,
  add column if not exists reservation_id  bigint references public.reservations(id) on delete set null;

-- 5. TRIP_FILES
alter table public.trip_files
  add column if not exists url         text,
  add column if not exists size        bigint,
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null,
  add column if not exists is_deleted  boolean not null default false,
  add column if not exists deleted_at  timestamp with time zone,
  add column if not exists starred     boolean not null default false;

create index if not exists idx_trip_files_is_deleted
  on public.trip_files(trip_id, is_deleted);

-- 6. PLACES — OSM
alter table public.places
  add column if not exists osm_id  text,
  add column if not exists source  text default 'manual';

create index if not exists idx_places_osm_id
  on public.places(osm_id) where osm_id is not null;

create index if not exists idx_places_google_place_id
  on public.places(google_place_id) where google_place_id is not null;

-- 7. COLLAB_MESSAGES
alter table public.collab_messages
  add column if not exists file_url      text,
  add column if not exists file_name     text,
  add column if not exists file_preview  text;

-- ✅ Done!
