alter table public.progression
  add column if not exists equipped_epithet_id text,
  add column if not exists public_epithet text not null default '',
  add column if not exists log_bootstrapped boolean not null default false;

create table if not exists public.system_log (
  id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  body text not null,
  occurred_on date not null,
  read_at timestamptz,
  primary key (user_id, id)
);

alter table public.system_log enable row level security;

drop policy if exists system_log_own on public.system_log;
create policy system_log_own on public.system_log
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on table public.system_log to authenticated;
