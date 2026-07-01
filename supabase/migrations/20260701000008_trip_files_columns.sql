-- =============================================================================
-- Migration 0008: Add missing columns to trip_files
-- The API uses: is_deleted, deleted_at, starred, url, uploaded_by, size
-- The original schema only had: id, trip_id, place_id, reservation_id,
--   filename, original_name, file_size, mime_type, description, created_at
-- =============================================================================

alter table public.trip_files
  add column if not exists url text,
  add column if not exists size bigint,
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamp with time zone,
  add column if not exists starred boolean not null default false;

-- Index for soft-delete queries (list active files)
create index if not exists idx_trip_files_is_deleted on public.trip_files(trip_id, is_deleted);
