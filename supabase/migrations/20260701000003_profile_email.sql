-- 1. Thêm cột email vào bảng profiles
alter table public.profiles add column if not exists email text;

-- 2. Cập nhật trigger handle_new_user để tự động lưu email khi đăng ký mới
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 3. Cập nhật email cho toàn bộ tài khoản người dùng hiện tại từ bảng auth.users
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- 4. Tạo hàm kiểm tra quyền Admin với cơ chế "security definer" để tránh đệ quy RLS
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 5. Xóa các chính sách cũ bị lỗi đệ quy vô hạn
drop policy if exists "Admins can select all trips" on public.trips;
drop policy if exists "Admins can select all places" on public.places;
drop policy if exists "Admins can select all trip files" on public.trip_files;
drop policy if exists "Admins can manage all profiles" on public.profiles;

-- 6. Tạo lại các chính sách RLS sử dụng hàm is_admin()

create policy "Admins can select all trips"
  on public.trips for select
  using (public.is_admin(auth.uid()));

create policy "Admins can select all places"
  on public.places for select
  using (public.is_admin(auth.uid()));

create policy "Admins can select all trip files"
  on public.trip_files for select
  using (public.is_admin(auth.uid()));

create policy "Admins can manage all profiles"
  on public.profiles for all
  using (public.is_admin(auth.uid()));

-- 7. Kích hoạt Supabase Realtime cho các bảng cần đồng bộ tức thời

-- Thêm các bảng vào publication supabase_realtime
alter publication supabase_realtime add table public.collab_messages;
alter publication supabase_realtime add table public.collab_notes;
alter publication supabase_realtime add table public.collab_polls;
alter publication supabase_realtime add table public.collab_poll_votes;
alter publication supabase_realtime add table public.trips;
alter publication supabase_realtime add table public.places;
alter publication supabase_realtime add table public.todo_items;
alter publication supabase_realtime add table public.packing_items;
alter publication supabase_realtime add table public.budget_items;
alter publication supabase_realtime add table public.reservations;
alter publication supabase_realtime add table public.days;
alter publication supabase_realtime add table public.day_assignments;
