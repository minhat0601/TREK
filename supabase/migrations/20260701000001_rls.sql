-- Tripp RLS Security Policies for Supabase

-- 1. Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.days enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.places enable row level security;
alter table public.place_tags enable row level security;
alter table public.day_assignments enable row level security;
alter table public.assignment_participants enable row level security;
alter table public.day_notes enable row level security;
alter table public.day_accommodations enable row level security;
alter table public.budget_items enable row level security;
alter table public.packing_items enable row level security;
alter table public.todo_items enable row level security;
alter table public.reservations enable row level security;
alter table public.photos enable row level security;
alter table public.trip_files enable row level security;
alter table public.collab_notes enable row level security;
alter table public.collab_polls enable row level security;
alter table public.collab_poll_votes enable row level security;
alter table public.collab_messages enable row level security;
alter table public.vacay_plans enable row level security;
alter table public.vacay_plan_members enable row level security;
alter table public.vacay_user_colors enable row level security;
alter table public.vacay_years enable row level security;
alter table public.vacay_user_years enable row level security;
alter table public.vacay_entries enable row level security;
alter table public.vacay_company_holidays enable row level security;
alter table public.vacay_holiday_calendars enable row level security;
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_channel_preferences enable row level security;

-- 2. Define Policies (Implicitly checking auth.uid() is not null via standard auth rules)

-- Profiles
create policy "Allow authenticated users to read all profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Allow users to update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Settings
create policy "Users can read their own settings"
  on public.settings for select
  using (auth.uid() = user_id);

create policy "Users can modify their own settings"
  on public.settings for all
  using (auth.uid() = user_id);

-- Trips
create policy "Users can select trips they have access to"
  on public.trips for select
  using (auth.role() = 'authenticated' and public.can_access_trip(id, auth.uid()));

create policy "Users can insert trips with their owner ID"
  on public.trips for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update trips they have access to"
  on public.trips for update
  using (auth.role() = 'authenticated' and public.can_access_trip(id, auth.uid()));

create policy "Users can delete trips they own"
  on public.trips for delete
  using (auth.uid() = user_id);

-- Trip Members
create policy "Users can view members of accessible trips"
  on public.trip_members for select
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

create policy "Trip owners can manage members"
  on public.trip_members for all
  using (auth.role() = 'authenticated' and exists (
    select 1 from public.trips t
    where t.id = trip_id and t.user_id = auth.uid()
  ));

-- Days
create policy "Users can access days of accessible trips"
  on public.days for all
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

-- Categories
create policy "Users can view global categories and their own categories"
  on public.categories for select
  using (auth.role() = 'authenticated' and (user_id is null or auth.uid() = user_id));

create policy "Users can manage their own categories"
  on public.categories for all
  using (auth.uid() = user_id);

-- Tags
create policy "Users can manage their own tags"
  on public.tags for all
  using (auth.uid() = user_id);

-- Places
create policy "Users can access places of accessible trips"
  on public.places for all
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

-- Place Tags
create policy "Users can access place tags of accessible trips"
  on public.place_tags for all
  using (auth.role() = 'authenticated' and exists (
    select 1 from public.places p
    where p.id = place_id and public.can_access_trip(p.trip_id, auth.uid())
  ));

-- Day Assignments
create policy "Users can access day assignments of accessible trips"
  on public.day_assignments for all
  using (auth.role() = 'authenticated' and exists (
    select 1 from public.days d
    where d.id = day_id and public.can_access_trip(d.trip_id, auth.uid())
  ));

-- Assignment Participants
create policy "Users can access assignment participants of accessible trips"
  on public.assignment_participants for all
  using (auth.role() = 'authenticated' and exists (
    select 1 from public.day_assignments da
    join public.days d on da.day_id = d.id
    where da.id = assignment_id and public.can_access_trip(d.trip_id, auth.uid())
  ));

-- Day Notes
create policy "Users can access day notes of accessible trips"
  on public.day_notes for all
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

-- Day Accommodations
create policy "Users can access accommodations of accessible trips"
  on public.day_accommodations for all
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

-- Budget Items
create policy "Users can access budget items of accessible trips"
  on public.budget_items for all
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

-- Packing Items
create policy "Users can access packing items of accessible trips"
  on public.packing_items for all
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

-- Todo Items
create policy "Users can access todo_items of accessible trips"
  on public.todo_items for all
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

-- Reservations
create policy "Users can access reservations of accessible trips"
  on public.reservations for all
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

-- Photos
create policy "Users can access photos of accessible trips"
  on public.photos for all
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

-- Trip Files
create policy "Users can access trip files of accessible trips"
  on public.trip_files for all
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

-- Collaboration Notes
create policy "Users can access collab notes of accessible trips"
  on public.collab_notes for all
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

-- Collaboration Polls
create policy "Users can access collab polls of accessible trips"
  on public.collab_polls for all
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

-- Collaboration Poll Votes
create policy "Users can access collab poll votes of accessible trips"
  on public.collab_poll_votes for all
  using (auth.role() = 'authenticated' and exists (
    select 1 from public.collab_polls cp
    where cp.id = poll_id and public.can_access_trip(cp.trip_id, auth.uid())
  ));

-- Collaboration Messages
create policy "Users can access collab messages of accessible trips"
  on public.collab_messages for all
  using (auth.role() = 'authenticated' and public.can_access_trip(trip_id, auth.uid()));

-- Notifications
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

create policy "Users can update their own notifications (read status)"
  on public.notifications for update
  using (auth.uid() = recipient_id);

create policy "Users can insert notifications for trip members"
  on public.notifications for insert
  with check (auth.role() = 'authenticated' and (sender_id = auth.uid()));

-- Preferences
create policy "Users can manage their own notification channel preferences"
  on public.notification_channel_preferences for all
  using (auth.uid() = user_id);

-- Audit Log (Admin only or system insert)
create policy "Allow system/authenticated users to insert logs"
  on public.audit_log for insert
  with check (auth.role() = 'authenticated');

create policy "Only admin role can read audit logs"
  on public.audit_log for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));
