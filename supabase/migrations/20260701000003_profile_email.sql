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
