-- =============================================================================
-- Migration 0007: Create Supabase Storage buckets + policies
-- Buckets used by the client:
--   avatars      → profile photos
--   covers       → trip cover images
--   trip-files   → trip file attachments (photos, docs)
--   photos       → photo provider library photos
--   journey-photos → journey diary photos (created in 0006 schema)
-- =============================================================================

-- avatars bucket (public — avatar URLs are embedded in UI directly)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- covers bucket (public — trip cover images embedded in UI)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'covers', 'covers', true,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- trip-files bucket (public for now — trip attachments)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-files', 'trip-files', true,
  52428800,  -- 50 MB
  null  -- all mime types allowed
)
on conflict (id) do nothing;

-- photos bucket (private — photo provider library, access via signed URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos', 'photos', false,
  52428800,  -- 50 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4']
)
on conflict (id) do nothing;

-- journey-photos bucket (public — diary photos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journey-photos', 'journey-photos', true,
  20971520,  -- 20 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- =============================================================================
-- Storage RLS policies
-- =============================================================================

-- ── avatars ──────────────────────────────────────────────────────────────────
-- Only the owner can upload/update/delete their own avatar (path = user_id.ext)
create policy "Avatar upload: owner only"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar update: owner only"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar delete: owner only"
  on storage.objects for delete
  using (
    bucket_id = 'avatars' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar read: public"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- ── covers ────────────────────────────────────────────────────────────────────
-- Any authenticated user can upload a cover (trip_id is in the filename)
create policy "Covers upload: authenticated"
  on storage.objects for insert
  with check (bucket_id = 'covers' and auth.role() = 'authenticated');

create policy "Covers update: authenticated"
  on storage.objects for update
  using (bucket_id = 'covers' and auth.role() = 'authenticated');

create policy "Covers delete: authenticated"
  on storage.objects for delete
  using (bucket_id = 'covers' and auth.role() = 'authenticated');

create policy "Covers read: public"
  on storage.objects for select
  using (bucket_id = 'covers');

-- ── trip-files ────────────────────────────────────────────────────────────────
create policy "Trip-files upload: authenticated"
  on storage.objects for insert
  with check (bucket_id = 'trip-files' and auth.role() = 'authenticated');

create policy "Trip-files update: authenticated"
  on storage.objects for update
  using (bucket_id = 'trip-files' and auth.role() = 'authenticated');

create policy "Trip-files delete: authenticated"
  on storage.objects for delete
  using (bucket_id = 'trip-files' and auth.role() = 'authenticated');

create policy "Trip-files read: public"
  on storage.objects for select
  using (bucket_id = 'trip-files');

-- ── photos ────────────────────────────────────────────────────────────────────
-- Private bucket: only owner can read their own photos (path starts with user_id/)
create policy "Photos upload: authenticated"
  on storage.objects for insert
  with check (bucket_id = 'photos' and auth.role() = 'authenticated');

create policy "Photos read: owner only"
  on storage.objects for select
  using (
    bucket_id = 'photos' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Photos delete: owner only"
  on storage.objects for delete
  using (
    bucket_id = 'photos' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── journey-photos ────────────────────────────────────────────────────────────
create policy "Journey-photos upload: authenticated"
  on storage.objects for insert
  with check (bucket_id = 'journey-photos' and auth.role() = 'authenticated');

create policy "Journey-photos update: authenticated"
  on storage.objects for update
  using (bucket_id = 'journey-photos' and auth.role() = 'authenticated');

create policy "Journey-photos delete: owner only"
  on storage.objects for delete
  using (
    bucket_id = 'journey-photos' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Journey-photos read: public"
  on storage.objects for select
  using (bucket_id = 'journey-photos');
