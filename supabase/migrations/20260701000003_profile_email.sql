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

-- 4. Bổ sung các chính sách RLS cho tài khoản Admin

-- Admin có quyền xem toàn bộ chuyến đi để thống kê số lượng
create policy "Admins can select all trips"
  on public.trips for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin có quyền xem toàn bộ địa điểm
create policy "Admins can select all places"
  on public.places for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin có quyền xem toàn bộ tệp tin tải lên
create policy "Admins can select all trip files"
  on public.trip_files for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin có quyền quản lý toàn bộ profiles (chỉnh sửa, phân quyền, xóa người dùng)
create policy "Admins can manage all profiles"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
