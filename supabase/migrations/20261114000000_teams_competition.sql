-- Equipes, competições e campanha.
-- Quem não é membro não lê a equipe. A busca pública não devolve treino nem e-mail.

alter table public.profiles
  add column if not exists username text,
  add column if not exists discoverable boolean not null default false,
  add column if not exists is_competitor boolean not null default false,
  add column if not exists primary_team_id uuid;

alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

create unique index if not exists profiles_username_lower
  on public.profiles (lower(username))
  where username is not null;

alter table public.rolas
  add column if not exists simulation boolean not null default false,
  add column if not exists started_standing boolean not null default false;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 60),
  slug text not null unique,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  status text not null check (status in ('invited', 'requested', 'active')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table public.profiles
  drop constraint if exists profiles_primary_team_fk;
alter table public.profiles
  add constraint profiles_primary_team_fk
  foreign key (primary_team_id) references public.teams (id) on delete set null;

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  organization text not null check (organization in ('ibjjf', 'cbjj', 'adcc', 'ajp', 'outro')),
  event_date date not null,
  city text not null default '',
  modality text not null check (modality in ('gi', 'nogi')),
  belt text check (belt is null or belt in ('branca', 'azul', 'roxa', 'marrom', 'preta', 'coral', 'vermelha')),
  age_division text not null default 'adulto' check (age_division in ('juvenil', 'adulto', 'master')),
  weight_class text not null default '',
  absolute boolean not null default false,
  absolute_placement text check (absolute_placement is null or absolute_placement in ('ouro', 'prata', 'bronze', 'participacao')),
  status text not null check (status in ('planned', 'done')),
  placement text check (placement is null or placement in ('ouro', 'prata', 'bronze', 'participacao')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.competition_matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  sort_order integer not null check (sort_order between 1 and 30),
  stage text not null check (stage in ('oitavas', 'quartas', 'semi', 'final', 'absoluto', 'outro')),
  opponent_name text not null,
  result text not null check (result in ('vitoria', 'derrota', 'empate')),
  method text not null check (method in ('finalizacao', 'pontos', 'vantagens', 'punicao', 'decisao', 'dq', 'wo')),
  technique_id text references public.techniques (id),
  points_for integer not null default 0 check (points_for >= 0),
  points_against integer not null default 0 check (points_against >= 0),
  advantages_for integer not null default 0 check (advantages_for >= 0),
  advantages_against integer not null default 0 check (advantages_against >= 0),
  penalties_for integer not null default 0 check (penalties_for >= 0),
  penalties_against integer not null default 0 check (penalties_against >= 0),
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 3600),
  notes text not null default ''
);

create table if not exists public.prep_plans (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  weekly_training_target integer not null check (weekly_training_target between 1 and 14),
  weekly_rola_target integer not null check (weekly_rola_target between 1 and 40),
  focus_attributes text[] not null default '{}' check (cardinality(focus_attributes) <= 3),
  target_weight_kg numeric,
  current_weight_kg numeric,
  active boolean not null default true
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_matches enable row level security;
alter table public.prep_plans enable row level security;

drop policy if exists teams_member_select on public.teams;
create policy teams_member_select on public.teams
  for select to authenticated
  using (
    exists (
      select 1 from public.team_members m
      where m.team_id = teams.id
        and m.user_id = auth.uid()
        and m.status in ('active', 'invited', 'requested')
    )
  );

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members
  for select to authenticated
  using (
    exists (
      select 1 from public.team_members me
      where me.team_id = team_members.team_id
        and me.user_id = auth.uid()
        and me.status in ('active', 'invited', 'requested')
    )
  );

drop policy if exists competitions_own on public.competitions;
create policy competitions_own on public.competitions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists competition_matches_own on public.competition_matches;
create policy competition_matches_own on public.competition_matches
  for all to authenticated
  using (
    exists (
      select 1 from public.competitions c
      where c.id = competition_matches.competition_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.competitions c
      where c.id = competition_matches.competition_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists prep_plans_own on public.prep_plans;
create policy prep_plans_own on public.prep_plans
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select on public.teams, public.team_members to authenticated;
grant select, insert, update, delete on public.competitions, public.competition_matches, public.prep_plans to authenticated;

-- Não membro: a política teams_member_select não devolve linha.
-- team_board e team_week_total levantam 'Equipe não encontrada' antes de ler treino.

create or replace function public.search_profiles(q text)
returns table (
  id uuid,
  username text,
  display_name text,
  belt text,
  academia text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  needle text;
begin
  if auth.uid() is null or q is null or char_length(trim(q)) < 2 or char_length(trim(q)) > 40 then
    return;
  end if;
  needle := replace(replace(trim(q), '%', ''), '_', '');
  if char_length(needle) < 2 then
    return;
  end if;
  return query
  select p.id, p.username, p.display_name, p.belt, p.academy
  from public.profiles p
  where p.discoverable
    and p.id <> auth.uid()
    and (
      coalesce(p.username, '') ilike '%' || needle || '%'
      or p.display_name ilike '%' || needle || '%'
      or p.academy ilike '%' || needle || '%'
    )
  order by p.display_name
  limit 8;
end;
$$;

create or replace function public.team_week_total(target uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  total integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.team_members m
    where m.team_id = target
      and m.user_id = auth.uid()
      and m.status = 'active'
  ) then
    raise exception 'Equipe não encontrada';
  end if;
  select count(*)::int into total
  from public.training_sessions s
  join public.team_members m
    on m.user_id = s.user_id
   and m.team_id = target
   and m.status = 'active'
  where s.session_date >= date_trunc('week', current_date)::date
    and s.session_date < date_trunc('week', current_date)::date + 7;
  return coalesce(total, 0);
end;
$$;

create or replace function public.team_board(target uuid)
returns table (
  user_id uuid,
  display_name text,
  belt text,
  role text,
  status text,
  weekly_trainings integer,
  public_level integer,
  public_title text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.team_members m
    where m.team_id = target
      and m.user_id = auth.uid()
      and m.status in ('active', 'invited', 'requested')
  ) then
    raise exception 'Equipe não encontrada';
  end if;
  return query
  select
    p.id,
    p.display_name,
    p.belt,
    m.role,
    m.status,
    case
      when p.id = auth.uid() or coalesce(pr.share_progress, false) then (
        select count(*)::int
        from public.training_sessions s
        where s.user_id = p.id
          and s.session_date >= date_trunc('week', current_date)::date
          and s.session_date < date_trunc('week', current_date)::date + 7
      )
      else null
    end,
    case when p.id = auth.uid() or coalesce(pr.share_progress, false) then pr.public_level else null end,
    case when p.id = auth.uid() or coalesce(pr.share_progress, false) then nullif(pr.public_title, '') else null end
  from public.team_members m
  join public.profiles p on p.id = m.user_id
  left join public.progression pr on pr.user_id = p.id
  where m.team_id = target;
end;
$$;

create or replace function public.create_team(team_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tid uuid := gen_random_uuid();
  code text := substr(md5(gen_random_uuid()::text), 1, 8);
  base text;
  next_slug text;
begin
  if uid is null then
    raise exception 'Não autenticado';
  end if;
  if char_length(trim(coalesce(team_name, ''))) < 2 then
    raise exception 'Dê um nome à equipe';
  end if;
  base := trim(both '-' from regexp_replace(lower(trim(team_name)), '[^a-z0-9]+', '-', 'g'));
  if base is null or base = '' then
    base := 'equipe';
  end if;
  next_slug := left(base, 40);
  while exists (select 1 from public.teams t where t.slug = next_slug) loop
    next_slug := left(base, 34) || '-' || substr(md5(random()::text), 1, 4);
  end loop;
  insert into public.teams (id, name, slug, owner_id, invite_code)
  values (tid, left(trim(team_name), 60), next_slug, uid, code);
  insert into public.team_members (team_id, user_id, role, status)
  values (tid, uid, 'owner', 'active');
  update public.profiles
    set primary_team_id = tid
    where id = uid and primary_team_id is null;
  return tid;
end;
$$;

create or replace function public.rename_team(target uuid, team_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.team_members m
    where m.team_id = target and m.user_id = auth.uid() and m.role = 'owner' and m.status = 'active'
  ) then
    raise exception 'Equipe não encontrada';
  end if;
  if char_length(trim(coalesce(team_name, ''))) < 2 then
    raise exception 'Dê um nome à equipe';
  end if;
  update public.teams set name = left(trim(team_name), 60) where id = target;
end;
$$;

create or replace function public.invite_to_team(target_team uuid, target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.team_members m
    where m.team_id = target_team and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner', 'admin')
  ) then
    raise exception 'Equipe não encontrada';
  end if;
  if target_user is null or target_user = auth.uid() or not exists (
    select 1 from public.profiles p where p.id = target_user and p.discoverable
  ) then
    raise exception 'Atleta não encontrado';
  end if;
  insert into public.team_members (team_id, user_id, role, status)
  values (target_team, target_user, 'member', 'invited')
  on conflict (team_id, user_id) do update
    set status = case when team_members.status = 'active' then 'active' else 'invited' end;
end;
$$;

create or replace function public.accept_team_invite(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  update public.team_members
    set status = 'active', joined_at = now()
    where team_id = target
      and user_id = auth.uid()
      and status in ('invited', 'requested');
  if not found then
    raise exception 'Convite não encontrado';
  end if;
end;
$$;

create or replace function public.join_team_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  select t.id into tid
  from public.teams t
  where lower(t.invite_code) = lower(trim(coalesce(code, '')));
  if tid is null then
    raise exception 'Código inválido';
  end if;
  insert into public.team_members (team_id, user_id, role, status)
  values (tid, auth.uid(), 'member', 'active')
  on conflict (team_id, user_id) do update
    set status = 'active',
        role = case when team_members.role = 'owner' then 'owner' else team_members.role end;
  update public.profiles
    set primary_team_id = tid
    where id = auth.uid() and primary_team_id is null;
  return tid;
end;
$$;

create or replace function public.leave_team(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  am_owner boolean;
  others integer;
begin
  if uid is null then
    raise exception 'Não autenticado';
  end if;
  select m.role = 'owner' into am_owner
  from public.team_members m
  where m.team_id = target and m.user_id = uid and m.status = 'active';
  if am_owner is null then
    raise exception 'Equipe não encontrada';
  end if;
  select count(*) into others
  from public.team_members m
  where m.team_id = target and m.user_id <> uid and m.status = 'active';
  if am_owner and others > 0 then
    raise exception 'Passe a equipe antes de sair';
  end if;
  if am_owner then
    delete from public.teams where id = target;
  else
    delete from public.team_members where team_id = target and user_id = uid;
  end if;
  update public.profiles set primary_team_id = null where id = uid and primary_team_id = target;
end;
$$;

create or replace function public.remove_team_member(target uuid, target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select t.owner_id into owner from public.teams t where t.id = target;
  if auth.uid() is null or owner is null or owner <> auth.uid() then
    raise exception 'Equipe não encontrada';
  end if;
  if target_user = owner then
    raise exception 'O dono permanece na equipe';
  end if;
  delete from public.team_members where team_id = target and user_id = target_user;
  if not found then
    raise exception 'Membro não encontrado';
  end if;
  update public.profiles set primary_team_id = null where id = target_user and primary_team_id = target;
end;
$$;

create or replace function public.set_primary_team(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  if target is not null and not exists (
    select 1 from public.team_members m
    where m.team_id = target and m.user_id = auth.uid() and m.status = 'active'
  ) then
    raise exception 'Equipe não encontrada';
  end if;
  update public.profiles set primary_team_id = target where id = auth.uid();
end;
$$;

revoke all on function public.search_profiles(text) from public, anon;
revoke all on function public.team_week_total(uuid) from public, anon;
revoke all on function public.team_board(uuid) from public, anon;
revoke all on function public.create_team(text) from public, anon;
revoke all on function public.rename_team(uuid, text) from public, anon;
revoke all on function public.invite_to_team(uuid, uuid) from public, anon;
revoke all on function public.accept_team_invite(uuid) from public, anon;
revoke all on function public.join_team_code(text) from public, anon;
revoke all on function public.leave_team(uuid) from public, anon;
revoke all on function public.remove_team_member(uuid, uuid) from public, anon;
revoke all on function public.set_primary_team(uuid) from public, anon;

grant execute on function public.search_profiles(text) to authenticated;
grant execute on function public.team_week_total(uuid) to authenticated;
grant execute on function public.team_board(uuid) to authenticated;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.rename_team(uuid, text) to authenticated;
grant execute on function public.invite_to_team(uuid, uuid) to authenticated;
grant execute on function public.accept_team_invite(uuid) to authenticated;
grant execute on function public.join_team_code(text) to authenticated;
grant execute on function public.leave_team(uuid) to authenticated;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;
grant execute on function public.set_primary_team(uuid) to authenticated;

-- O rola passa a guardar simulação e início em pé.
create or replace function public.save_training_session(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  existing uuid;
  r record;
  rid uuid;
  v_partner uuid;
  v_partner_name text;
  v_athlete_name text;
  v_date date;
  v_modality text;
  v_federation text;
  v_minutes int;
begin
  if uid is null then
    raise exception 'Não autenticado';
  end if;
  if jsonb_typeof(payload->'rolas') <> 'array' or jsonb_array_length(payload->'rolas') < 1 then
    raise exception 'Adicione pelo menos um rola';
  end if;
  if jsonb_array_length(payload->'rolas') > 30 then
    raise exception 'Um treino pode ter no máximo 30 rolas';
  end if;
  if coalesce(payload->>'date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Data inválida';
  end if;

  v_date := (payload->>'date')::date;
  v_modality := payload->>'modality';
  if v_modality not in ('gi', 'nogi') then
    raise exception 'Modalidade inválida';
  end if;
  v_federation := coalesce(nullif(payload->>'federationId', ''), 'ibjjf');
  if not exists (select 1 from public.federations where id = v_federation) then
    raise exception 'Federação desconhecida';
  end if;

  select display_name into v_athlete_name from public.profiles where id = uid;
  if v_athlete_name is null then
    raise exception 'Perfil não encontrado';
  end if;

  if nullif(payload->>'id', '') is null then
    sid := gen_random_uuid();
    insert into public.training_sessions (id, user_id, session_date, modality, notes, federation_id)
    values (sid, uid, v_date, v_modality, left(coalesce(payload->>'notes', ''), 2000), v_federation);
  else
    sid := (payload->>'id')::uuid;
    update public.training_sessions
      set session_date = v_date,
          modality = v_modality,
          notes = left(coalesce(payload->>'notes', ''), 2000),
          federation_id = v_federation
      where id = sid and user_id = uid
      returning id into existing;
    if existing is null then
      raise exception 'Treino não encontrado ou sem permissão';
    end if;
    delete from public.rolas where session_id = sid;
  end if;

  for r in select value from jsonb_array_elements(payload->'rolas') as t(value)
  loop
    v_partner := nullif(r.value->>'partnerUserId', '')::uuid;
    if v_partner = uid then
      raise exception 'Você não pode registrar um rola contra si mesmo';
    end if;
    if v_partner is not null and not exists (select 1 from public.profiles where id = v_partner) then
      raise exception 'Parceiro não encontrado';
    end if;

    v_partner_name := trim(coalesce(r.value->>'partnerName', ''));
    if v_partner is not null and v_partner_name = '' then
      select display_name into v_partner_name from public.profiles where id = v_partner;
    end if;
    if v_partner_name = '' then
      raise exception 'Informe o parceiro do rola';
    end if;
    if coalesce(r.value->>'result', '') not in ('vitoria', 'derrota', 'empate', 'sem_resultado') then
      raise exception 'Resultado inválido';
    end if;

    v_minutes := coalesce((r.value->>'durationMinutes')::int, 0);
    if v_minutes < 1 or v_minutes > 90 then
      raise exception 'Duração inválida';
    end if;

    if exists (
      select 1
      from (
        select jsonb_array_elements_text(coalesce(r.value->'techniquesUsed', '[]'::jsonb)) as technique_id
        union all
        select jsonb_array_elements_text(coalesce(r.value->'submissionsApplied', '[]'::jsonb))
        union all
        select jsonb_array_elements_text(coalesce(r.value->'submissionsSuffered', '[]'::jsonb))
      ) listed
      where listed.technique_id <> ''
        and not exists (select 1 from public.techniques where id = listed.technique_id)
    ) then
      raise exception 'Técnica desconhecida no catálogo';
    end if;

    rid := gen_random_uuid();
    insert into public.rolas (
      id, session_id, athlete_id, athlete_name, partner_user_id, partner_name,
      occurred_on, modality, federation_id, duration_seconds, result,
      points_athlete, points_partner, advantages_athlete, advantages_partner,
      penalties_athlete, penalties_partner, simulation, started_standing
    ) values (
      rid, sid, uid, v_athlete_name, v_partner, left(v_partner_name, 80),
      v_date, v_modality, v_federation, v_minutes * 60, r.value->>'result',
      greatest(coalesce((r.value->>'pointsFor')::int, 0), 0),
      greatest(coalesce((r.value->>'pointsAgainst')::int, 0), 0),
      greatest(coalesce((r.value->>'advantagesFor')::int, 0), 0),
      greatest(coalesce((r.value->>'advantagesAgainst')::int, 0), 0),
      greatest(coalesce((r.value->>'penaltiesFor')::int, 0), 0),
      greatest(coalesce((r.value->>'penaltiesAgainst')::int, 0), 0),
      coalesce((r.value->>'simulation')::boolean, false),
      coalesce((r.value->>'startedStanding')::boolean, false)
    );

    insert into public.rola_actions (rola_id, technique_id, performer, action_type)
    select rid, technique_id, 'self', 'tecnica'
    from jsonb_array_elements_text(coalesce(r.value->'techniquesUsed', '[]'::jsonb)) as technique_id
    where technique_id <> '';

    insert into public.rola_actions (rola_id, technique_id, performer, action_type)
    select rid, technique_id, 'self', 'finalizacao'
    from jsonb_array_elements_text(coalesce(r.value->'submissionsApplied', '[]'::jsonb)) as technique_id
    where technique_id <> '';

    insert into public.rola_actions (rola_id, technique_id, performer, action_type)
    select rid, technique_id, 'partner', 'finalizacao'
    from jsonb_array_elements_text(coalesce(r.value->'submissionsSuffered', '[]'::jsonb)) as technique_id
    where technique_id <> '';
  end loop;

  return sid;
end;
$$;
