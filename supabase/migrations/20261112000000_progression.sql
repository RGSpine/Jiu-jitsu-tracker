-- O nível e as habilidades são calculados dos rolas no cliente.
-- Esta tabela guarda só o que não dá para deduzir: o título equipado,
-- se o parceiro pode ver o crachá, o nível já calculado para essa leitura
-- e quais avisos já foram mostrados. O parceiro não lê o histórico.

create table if not exists public.progression (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  share_progress boolean not null default false,
  equipped_title_id text,
  public_level integer not null default 1 check (public_level between 1 and 99),
  public_title text not null default '',
  seen_unlocks text[] not null default '{}',
  updated_at timestamptz not null default now()
);

drop trigger if exists progression_updated_at on public.progression;
create trigger progression_updated_at
  before update on public.progression
  for each row execute function public.set_updated_at();

alter table public.progression enable row level security;

drop policy if exists progression_own on public.progression;
create policy progression_own on public.progression
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists progression_partner_read on public.progression;
create policy progression_partner_read on public.progression
  for select
  using (
    share_progress
    and exists (
      select 1 from public.rolas r
      where (r.athlete_id = progression.user_id and r.partner_user_id = auth.uid())
         or (r.partner_user_id = progression.user_id and r.athlete_id = auth.uid())
    )
  );

grant select, insert, update on table public.progression to authenticated;
