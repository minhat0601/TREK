-- =============================================================================
-- COMPREHENSIVE AUDIT MIGRATION
-- Rà soát và bổ sung toàn bộ bảng, quyền RLS còn thiếu
-- =============================================================================

-- =============================================================================
-- PHẦN 1: BỔ SUNG RLS CHO CÁC BẢNG VACAY (bật RLS nhưng THIẾU policies)
-- =============================================================================

-- vacay_plans
create policy "Owner can manage their vacay plan"
  on public.vacay_plans for all
  using (auth.uid() = owner_id);

create policy "Members can read plans they are invited to"
  on public.vacay_plans for select
  using (
    exists (
      select 1 from public.vacay_plan_members
      where plan_id = id and user_id = auth.uid() and status = 'accepted'
    )
  );

-- vacay_plan_members
create policy "Plan owner can manage plan members"
  on public.vacay_plan_members for all
  using (
    exists (
      select 1 from public.vacay_plans
      where id = plan_id and owner_id = auth.uid()
    )
  );

create policy "Members can read their own membership"
  on public.vacay_plan_members for select
  using (auth.uid() = user_id);

create policy "Members can update their own status"
  on public.vacay_plan_members for update
  using (auth.uid() = user_id);

-- vacay_user_colors
create policy "Users can manage their own colors"
  on public.vacay_user_colors for all
  using (auth.uid() = user_id);

create policy "Plan members can read colors"
  on public.vacay_user_colors for select
  using (
    exists (
      select 1 from public.vacay_plans vp
      left join public.vacay_plan_members vpm on vpm.plan_id = vp.id and vpm.user_id = auth.uid()
      where vp.id = plan_id and (vp.owner_id = auth.uid() or vpm.status = 'accepted')
    )
  );

-- vacay_years
create policy "Plan owner can manage vacay years"
  on public.vacay_years for all
  using (
    exists (select 1 from public.vacay_plans where id = plan_id and owner_id = auth.uid())
  );

create policy "Plan members can read vacay years"
  on public.vacay_years for select
  using (
    exists (
      select 1 from public.vacay_plan_members
      where plan_id = vacay_years.plan_id and user_id = auth.uid() and status = 'accepted'
    )
  );

-- vacay_user_years
create policy "Users can manage their own user years"
  on public.vacay_user_years for all
  using (auth.uid() = user_id);

create policy "Plan owner can read all user years"
  on public.vacay_user_years for select
  using (
    exists (select 1 from public.vacay_plans where id = plan_id and owner_id = auth.uid())
  );

-- vacay_entries
create policy "Users can manage their own entries"
  on public.vacay_entries for all
  using (auth.uid() = user_id);

create policy "Plan members can read all entries"
  on public.vacay_entries for select
  using (
    exists (
      select 1 from public.vacay_plans vp
      left join public.vacay_plan_members vpm on vpm.plan_id = vp.id and vpm.user_id = auth.uid()
      where vp.id = vacay_entries.plan_id and (vp.owner_id = auth.uid() or vpm.status = 'accepted')
    )
  );

-- vacay_company_holidays
create policy "Plan owner can manage company holidays"
  on public.vacay_company_holidays for all
  using (exists (select 1 from public.vacay_plans where id = plan_id and owner_id = auth.uid()));

create policy "Plan members can read company holidays"
  on public.vacay_company_holidays for select
  using (
    exists (
      select 1 from public.vacay_plan_members
      where plan_id = vacay_company_holidays.plan_id and user_id = auth.uid() and status = 'accepted'
    )
  );

-- vacay_holiday_calendars
create policy "Plan owner can manage holiday calendars"
  on public.vacay_holiday_calendars for all
  using (exists (select 1 from public.vacay_plans where id = plan_id and owner_id = auth.uid()));

create policy "Plan members can read holiday calendars"
  on public.vacay_holiday_calendars for select
  using (
    exists (
      select 1 from public.vacay_plan_members
      where plan_id = vacay_holiday_calendars.plan_id and user_id = auth.uid() and status = 'accepted'
    )
  );

-- =============================================================================
-- PHẦN 2: BỔ SUNG RLS CHO app_settings, addons, photo_providers (CHƯA CÓ)
-- =============================================================================

alter table public.app_settings enable row level security;
create policy "Admins can manage app settings"
  on public.app_settings for all using (public.is_admin(auth.uid()));
create policy "Authenticated users can read app settings"
  on public.app_settings for select using (auth.role() = 'authenticated');

alter table public.addons enable row level security;
create policy "Admins can manage addons"
  on public.addons for all using (public.is_admin(auth.uid()));
create policy "Authenticated users can read addons"
  on public.addons for select using (auth.role() = 'authenticated');

alter table public.photo_providers enable row level security;
create policy "Admins can manage photo providers"
  on public.photo_providers for all using (public.is_admin(auth.uid()));
create policy "Authenticated users can read photo providers"
  on public.photo_providers for select using (auth.role() = 'authenticated');

alter table public.photo_provider_fields enable row level security;
create policy "Admins can manage photo provider fields"
  on public.photo_provider_fields for all using (public.is_admin(auth.uid()));
create policy "Authenticated users can read photo provider fields"
  on public.photo_provider_fields for select using (auth.role() = 'authenticated');

-- =============================================================================
-- PHẦN 3: TẠO BẢNG invite_links (Admin invite system)
-- =============================================================================

create table if not exists public.invite_links (
  id bigint generated by default as identity primary key,
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  max_uses integer default 1 not null,
  used_count integer default 0 not null,
  expires_at timestamp with time zone,
  created_by uuid references auth.users(id) on delete cascade not null,
  created_by_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.invite_links enable row level security;

create policy "Admins can manage invite links"
  on public.invite_links for all using (public.is_admin(auth.uid()));

create policy "Anyone can read invite links for registration"
  on public.invite_links for select using (true);

create index if not exists idx_invite_links_token on public.invite_links(token);
create index if not exists idx_invite_links_expires_at on public.invite_links(expires_at);

-- =============================================================================
-- PHẦN 4: TẠO BẢNG packing_templates (Admin packing templates)
-- =============================================================================

create table if not exists public.packing_templates (
  id bigint generated by default as identity primary key,
  name text not null,
  description text,
  icon text default '🎒' not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.packing_template_categories (
  id bigint generated by default as identity primary key,
  template_id bigint references public.packing_templates(id) on delete cascade not null,
  name text not null,
  icon text default '📦' not null,
  sort_order integer default 0 not null
);

create table if not exists public.packing_template_items (
  id bigint generated by default as identity primary key,
  template_id bigint references public.packing_templates(id) on delete cascade not null,
  category_id bigint references public.packing_template_categories(id) on delete set null,
  name text not null,
  sort_order integer default 0 not null
);

alter table public.packing_templates enable row level security;
alter table public.packing_template_categories enable row level security;
alter table public.packing_template_items enable row level security;

create policy "Admins can manage packing templates"
  on public.packing_templates for all using (public.is_admin(auth.uid()));
create policy "Authenticated users can read packing templates"
  on public.packing_templates for select using (auth.role() = 'authenticated');

create policy "Admins can manage template categories"
  on public.packing_template_categories for all using (public.is_admin(auth.uid()));
create policy "Authenticated users can read template categories"
  on public.packing_template_categories for select using (auth.role() = 'authenticated');

create policy "Admins can manage template items"
  on public.packing_template_items for all using (public.is_admin(auth.uid()));
create policy "Authenticated users can read template items"
  on public.packing_template_items for select using (auth.role() = 'authenticated');

-- =============================================================================
-- PHẦN 5: BỔ SUNG INDEX CÒN THIẾU
-- =============================================================================

create index if not exists idx_trip_share_links_trip_id on public.trip_share_links(trip_id);
create index if not exists idx_trip_share_links_token on public.trip_share_links(token);
create index if not exists idx_vacay_entries_plan_date on public.vacay_entries(plan_id, date);
create index if not exists idx_vacay_entries_user on public.vacay_entries(user_id);
create index if not exists idx_packing_templates_sort on public.packing_templates(sort_order);

-- =============================================================================
-- PHẦN 6: SEED DỮ LIỆU DEFAULT
-- =============================================================================

-- Default app settings
insert into public.app_settings (key, value) values
  ('registration_enabled', 'true'),
  ('require_invite', 'false'),
  ('max_trips_per_user', '100'),
  ('app_name', 'Tripp')
on conflict (key) do nothing;

-- Default addons
insert into public.addons (id, name, description, type, icon, enabled, sort_order) values
  ('maps', 'Maps & Places', 'Google Maps integration for places and routing', 'global', 'Map', false, 1),
  ('weather', 'Weather', 'OpenWeather integration for trip weather forecasts', 'global', 'Cloud', false, 2),
  ('unsplash', 'Unsplash Photos', 'Free stock photos for trip covers and places', 'global', 'Image', false, 3),
  ('vacay', 'Vacay Planner', 'Team vacation planning and leave management', 'global', 'Calendar', false, 4),
  ('collab', 'Collaboration', 'Real-time chat, notes and polls for trip members', 'global', 'MessageSquare', false, 5),
  ('vietqr', 'VietQR', 'VietQR payment for budget settlements', 'global', 'CreditCard', false, 6)
on conflict (id) do nothing;
