import { writeFileSync, mkdirSync } from "node:fs";
import { techniques } from "../src/data/catalog.ts";
import { glossary } from "../src/data/glossary.ts";
import { federations, scoringRules } from "../src/data/rules.ts";

const glossaryAliases = new Map(
  glossary.map((entry) => [entry.id, [...entry.aliases, ...entry.misspellings]]),
);

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlArray(values) {
  if (!values.length) return "array[]::text[]";
  return `array[${values.map(sqlString).join(", ")}]`;
}

const techniqueRows = techniques
  .map((item) => {
    const aliases = [...new Set([...(item.aliases ?? []), ...(glossaryAliases.get(item.id) ?? [])])];
    return `  (${sqlString(item.id)}, ${sqlString(item.name)}, ${sqlString(item.category)}, ${sqlString(item.modality)}, ${
      item.scoringCode ? sqlString(item.scoringCode) : "null"
    }, ${sqlArray(aliases)})`;
  })
  .join(",\n");

const federationRows = federations
  .map((item) => `  (${sqlString(item.id)}, ${sqlString(item.name)}, ${item.isDefault ? "true" : "false"})`)
  .join(",\n");

const ruleRows = scoringRules
  .map(
    (item) =>
      `  (${sqlString(item.federationId)}, ${sqlString(item.code)}, ${sqlString(item.label)}, ${item.points})`,
  )
  .join(",\n");

const sql = ` -- Tatame: esquema, RLS e catálogo inicial.
-- Pode ser colado no SQL Editor do Supabase. As tabelas são criadas uma vez;
-- políticas, funções e sementes podem ser reaplicadas.

create extension if not exists pgcrypto;

create table if not exists public.federations (
  id text primary key,
  name text not null,
  is_default boolean not null default false
);

create table if not exists public.scoring_rules (
  federation_id text not null references public.federations (id) on delete cascade,
  code text not null,
  label text not null,
  points integer not null check (points >= 0),
  primary key (federation_id, code)
);

create table if not exists public.techniques (
  id text primary key,
  name text not null,
  category text not null check (category in ('queda', 'raspagem', 'passagem', 'finalizacao', 'controle', 'escape')),
  modality text not null check (modality in ('gi', 'nogi', 'both')),
  scoring_code text,
  aliases text[] not null default '{}'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  belt text check (belt is null or belt in ('branca', 'azul', 'roxa', 'marrom', 'preta', 'coral', 'vermelha')),
  stripes integer not null default 0 check (stripes between 0 and 6),
  academy text not null default '',
  preferred_modality text not null default 'nogi' check (preferred_modality in ('gi', 'nogi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_date date not null,
  modality text not null check (modality in ('gi', 'nogi')),
  notes text not null default '',
  federation_id text not null references public.federations (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rolas (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions (id) on delete cascade,
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  athlete_name text not null,
  partner_user_id uuid references public.profiles (id) on delete set null,
  partner_name text not null,
  occurred_on date not null,
  modality text not null check (modality in ('gi', 'nogi')),
  federation_id text not null references public.federations (id),
  duration_seconds integer not null check (duration_seconds between 60 and 5400),
  result text not null check (result in ('vitoria', 'derrota', 'empate', 'sem_resultado')),
  points_athlete integer not null default 0 check (points_athlete >= 0),
  points_partner integer not null default 0 check (points_partner >= 0),
  advantages_athlete integer not null default 0 check (advantages_athlete >= 0),
  advantages_partner integer not null default 0 check (advantages_partner >= 0),
  penalties_athlete integer not null default 0 check (penalties_athlete >= 0),
  penalties_partner integer not null default 0 check (penalties_partner >= 0),
  created_at timestamptz not null default now(),
  check (partner_user_id is null or partner_user_id <> athlete_id)
);

create table if not exists public.rola_actions (
  id uuid primary key default gen_random_uuid(),
  rola_id uuid not null references public.rolas (id) on delete cascade,
  technique_id text not null references public.techniques (id),
  performer text not null check (performer in ('self', 'partner')),
  action_type text not null check (action_type in ('tecnica', 'finalizacao'))
);

create index if not exists training_sessions_user_date_idx
  on public.training_sessions (user_id, session_date desc);
create index if not exists rolas_athlete_date_idx
  on public.rolas (athlete_id, occurred_on desc);
create index if not exists rolas_partner_date_idx
  on public.rolas (partner_user_id, occurred_on desc);
create index if not exists rola_actions_rola_idx
  on public.rola_actions (rola_id);
create index if not exists profiles_email_idx
  on public.profiles (email);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists sessions_updated_at on public.training_sessions;
create trigger sessions_updated_at
  before update on public.training_sessions
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, display_name, belt, stripes, academy, preferred_modality
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(coalesce(new.email, 'atleta'), '@', 1)),
    nullif(new.raw_user_meta_data->>'belt', ''),
    coalesce(nullif(new.raw_user_meta_data->>'stripes', '')::int, 0),
    coalesce(new.raw_user_meta_data->>'academy', ''),
    coalesce(nullif(new.raw_user_meta_data->>'preferred_modality', ''), 'nogi')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Um rola é um único registro. O atleta que anota é a perspectiva canônica.
-- O parceiro vinculado lê a mesma linha; o app inverte resultado, pontos e finalizações.
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
      penalties_athlete, penalties_partner
    ) values (
      rid, sid, uid, v_athlete_name, v_partner, left(v_partner_name, 80),
      v_date, v_modality, v_federation, v_minutes * 60, r.value->>'result',
      greatest(coalesce((r.value->>'pointsFor')::int, 0), 0),
      greatest(coalesce((r.value->>'pointsAgainst')::int, 0), 0),
      greatest(coalesce((r.value->>'advantagesFor')::int, 0), 0),
      greatest(coalesce((r.value->>'advantagesAgainst')::int, 0), 0),
      greatest(coalesce((r.value->>'penaltiesFor')::int, 0), 0),
      greatest(coalesce((r.value->>'penaltiesAgainst')::int, 0), 0)
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

create or replace function public.delete_training_session(sid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  delete from public.training_sessions
  where id = sid and user_id = auth.uid();
  if not found then
    raise exception 'Treino não encontrado ou sem permissão';
  end if;
end;
$$;

create or replace function public.search_partners(q text)
returns table (
  id uuid,
  display_name text,
  belt text,
  academy text,
  preferred_modality text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  if q is null or char_length(trim(q)) < 2 then
    return;
  end if;
  return query
  select p.id, p.display_name, p.belt, p.academy, p.preferred_modality
  from public.profiles p
  where p.id <> auth.uid()
    and (
      p.display_name ilike '%' || trim(q) || '%'
      or p.email ilike trim(q)
      or p.email ilike trim(q) || '%'
    )
  order by p.display_name
  limit 8;
end;
$$;

revoke all on function public.save_training_session(jsonb) from public, anon;
revoke all on function public.delete_training_session(uuid) from public, anon;
revoke all on function public.search_partners(text) from public, anon;
grant execute on function public.save_training_session(jsonb) to authenticated;
grant execute on function public.delete_training_session(uuid) to authenticated;
grant execute on function public.search_partners(text) to authenticated;

alter table public.federations enable row level security;
alter table public.scoring_rules enable row level security;
alter table public.techniques enable row level security;
alter table public.profiles enable row level security;
alter table public.training_sessions enable row level security;
alter table public.rolas enable row level security;
alter table public.rola_actions enable row level security;

drop policy if exists federations_read on public.federations;
create policy federations_read on public.federations
  for select to authenticated using (true);

drop policy if exists scoring_rules_read on public.scoring_rules;
create policy scoring_rules_read on public.scoring_rules
  for select to authenticated using (true);

drop policy if exists techniques_read on public.techniques;
create policy techniques_read on public.techniques
  for select to authenticated using (true);

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists sessions_own on public.training_sessions;
create policy sessions_own on public.training_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists rolas_select_participant on public.rolas;
create policy rolas_select_participant on public.rolas
  for select to authenticated
  using (athlete_id = auth.uid() or partner_user_id = auth.uid());

drop policy if exists rolas_insert_own on public.rolas;
create policy rolas_insert_own on public.rolas
  for insert to authenticated
  with check (athlete_id = auth.uid());

drop policy if exists rolas_update_own on public.rolas;
create policy rolas_update_own on public.rolas
  for update to authenticated
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

drop policy if exists rolas_delete_own on public.rolas;
create policy rolas_delete_own on public.rolas
  for delete to authenticated
  using (athlete_id = auth.uid());

drop policy if exists actions_select_participant on public.rola_actions;
create policy actions_select_participant on public.rola_actions
  for select to authenticated
  using (
    exists (
      select 1 from public.rolas r
      where r.id = rola_id
        and (r.athlete_id = auth.uid() or r.partner_user_id = auth.uid())
    )
  );

drop policy if exists actions_write_owner on public.rola_actions;
create policy actions_write_owner on public.rola_actions
  for all to authenticated
  using (
    exists (
      select 1 from public.rolas r
      where r.id = rola_id and r.athlete_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rolas r
      where r.id = rola_id and r.athlete_id = auth.uid()
    )
  );

revoke all on table public.profiles from anon, authenticated;
grant select (
  id, display_name, belt, stripes, academy, preferred_modality, created_at, updated_at
) on public.profiles to authenticated;
grant update (
  display_name, belt, stripes, academy, preferred_modality
) on public.profiles to authenticated;
grant insert (
  id, email, display_name, belt, stripes, academy, preferred_modality
) on public.profiles to authenticated;

revoke all on table public.federations, public.scoring_rules, public.techniques from anon, authenticated;
grant select on public.federations, public.scoring_rules, public.techniques to authenticated;

revoke all on table public.training_sessions, public.rolas, public.rola_actions from anon, authenticated;
grant select, insert, update, delete on public.training_sessions, public.rolas, public.rola_actions to authenticated;

insert into public.federations (id, name, is_default) values
${federationRows}
on conflict (id) do update set name = excluded.name, is_default = excluded.is_default;

insert into public.scoring_rules (federation_id, code, label, points) values
${ruleRows}
on conflict (federation_id, code) do update
  set label = excluded.label, points = excluded.points;

insert into public.techniques (id, name, category, modality, scoring_code, aliases) values
${techniqueRows}
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  modality = excluded.modality,
  scoring_code = excluded.scoring_code,
  aliases = excluded.aliases;

-- Outra federação entra como dado, sem mudar o app. Exemplo comentado:
-- insert into public.federations (id, name, is_default) values ('adcc', 'ADCC', false);
-- insert into public.scoring_rules (federation_id, code, label, points) values
--   ('adcc', 'takedown', 'Queda', 2);
`;

mkdirSync(new URL("../supabase/migrations/", import.meta.url), { recursive: true });
writeFileSync(new URL("../supabase/migrations/20261111000000_init.sql", import.meta.url), sql);
console.log("migration written", techniques.length, "techniques");
