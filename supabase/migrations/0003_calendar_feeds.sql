-- Live calendar links: one private link per person, for Google Calendar and Apple Calendar
-- to subscribe to (served by the "calendar" Edge Function, see supabase/functions/calendar).
-- Run this once in Supabase -> SQL Editor, after 0001 and 0002.

create table public.calendar_feeds (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  token            uuid not null unique default gen_random_uuid(),  -- the secret part of the link
  include_trips    boolean not null default true,
  include_deadlines boolean not null default true,
  include_flights  boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;
revoke all on public.calendar_feeds from anon;
grant select, insert, update, delete on public.calendar_feeds to authenticated;

-- Each approved person sees and changes only their own link. Pending people cannot make one.
-- (The Edge Function reads every link with the service key, which bypasses these rules.)
create policy "own feed read"   on public.calendar_feeds for select to authenticated
  using (user_id = auth.uid() and public.is_staff());
create policy "own feed add"    on public.calendar_feeds for insert to authenticated
  with check (user_id = auth.uid() and public.is_staff());
create policy "own feed change" on public.calendar_feeds for update to authenticated
  using (user_id = auth.uid() and public.is_staff()) with check (user_id = auth.uid() and public.is_staff());
create policy "own feed delete" on public.calendar_feeds for delete to authenticated
  using (user_id = auth.uid() and public.is_staff());
