-- Open sign-up with admin approval.
-- People can now create an account (email + password, email link, or Google). Every new account
-- is 'pending' and, by the access rules in 0001, sees nothing until an admin approves it.
-- This migration also records how each person signs in and their name, so the admin can recognise
-- them in Admin → Staff accounts.
--
-- Rollback: drop the two columns and restore handle_new_user from 0001. No business data is touched.

alter table public.profiles
  add column if not exists provider   text,   -- 'email', 'google', …
  add column if not exists avatar_url text;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, provider, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''),
    coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Fill in the details for accounts created before this migration.
update public.profiles p
set provider     = coalesce(p.provider, u.raw_app_meta_data ->> 'provider', 'email'),
    display_name = coalesce(p.display_name, nullif(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'), '')),
    avatar_url   = coalesce(p.avatar_url, u.raw_user_meta_data ->> 'avatar_url')
from auth.users u
where u.id = p.id;
