-- =============================================================================
-- Migration 0009: Add osm_id + source columns to places table
-- Client code stores OSM place IDs (e.g. "node:12345") when adding places
-- via Nominatim/OpenStreetMap search (no Google Maps key required).
-- Also adds 'source' to track whether a place came from google/osm/manual.
-- =============================================================================

alter table public.places
  add column if not exists osm_id text,
  add column if not exists source text default 'manual';

-- Index for lookup by OSM ID (used by PlaceAvatar, PlaceInspector, PDF export)
create index if not exists idx_places_osm_id on public.places(osm_id) where osm_id is not null;

-- Index for lookup by Google Place ID (existing feature)
create index if not exists idx_places_google_place_id on public.places(google_place_id) where google_place_id is not null;
