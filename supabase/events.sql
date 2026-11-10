-- Job Sprint: anonymous usage events (which tabs and actions get used).
-- Run once in the Job Sprint V1 Supabase project's SQL Editor. Additive, safe to re-run.
-- New table only; nothing existing is touched. No names, IPs or emails are stored.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) <= 40),
  detail text check (detail is null or char_length(detail) <= 40),
  vid text check (vid is null or char_length(vid) <= 64), -- random id kept in one browser
  sid text check (sid is null or char_length(sid) <= 64), -- random id for one tab session
  ref text check (ref is null or char_length(ref) <= 80)  -- where the visit came from
);
create index if not exists events_created_idx on public.events (created_at desc);
create index if not exists events_name_idx on public.events (name, created_at desc);
alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;
grant all on public.events to service_role;

-- Handy queries (run in the SQL Editor):
-- Visitors and sessions per day:
--   select created_at::date as day, count(distinct vid) as visitors, count(distinct sid) as sessions
--   from public.events where name = 'page_open' group by 1 order by 1 desc;
-- Feature usage, last 30 days:
--   select name, detail, count(*) as times from public.events
--   where created_at > now() - interval '30 days' and name <> 'page_open'
--   group by 1, 2 order by times desc;
-- Where visitors come from:
--   select coalesce(ref, 'direct') as source, count(distinct vid) as visitors
--   from public.events where name = 'page_open' group by 1 order by 2 desc;
