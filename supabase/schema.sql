-- Campfire Songbook — full schema as applied to the `campfire-songbook`
-- Supabase project. Run this against an empty database to recreate it, then
-- load supabase/seed/songs.sql.
--
-- Applied as migrations:
--   20260912003502_create_songbook_schema
--   20260912004436_add_submission_rate_limit
--   20260912005206_add_submit_song_rpc
--   20260912005745_admins_keyed_by_email
--   20260912010114_move_is_admin_to_private_schema

-- Tags (the filter chips) --------------------------------------------------
create table public.tags (
  slug        text primary key,
  label       text not null,
  sort_order  integer not null default 0
);

insert into public.tags (slug, label, sort_order) values
  ('loud',    'Loud',    1),
  ('actions', 'Actions', 2),
  ('echo',    'Echo',    3),
  ('round',   'Rounds',  4),
  ('quiet',   'Quiet',   5);

-- Songs --------------------------------------------------------------------
-- `blocks` holds the song body as structured JSON rather than HTML, so nothing
-- a submitter types is ever rendered as markup. See lib/types.ts for the shape.
create table public.songs (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  tag             text not null references public.tags(slug) on update cascade,
  category_label  text,
  tune            text,
  blocks          jsonb not null default '[]'::jsonb,
  sort_order      integer not null default 0,
  published       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint songs_blocks_is_array check (jsonb_typeof(blocks) = 'array')
);

create index songs_sort_idx on public.songs (sort_order);
create index songs_published_idx on public.songs (published) where published;

-- Public submissions -------------------------------------------------------
create table public.submissions (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  tag                text references public.tags(slug) on update cascade,
  tune               text,
  body               text not null,
  submitter_name     text,
  submitter_email    text,
  submitter_note     text,
  status             text not null default 'pending'
                       check (status in ('pending','approved','rejected')),
  review_note        text,
  reviewed_by_email  text,
  reviewed_at        timestamptz,
  published_song_id  uuid references public.songs(id) on delete set null,
  ip_hash            text,
  created_at         timestamptz not null default now()
);

create index submissions_status_idx on public.submissions (status, created_at desc);
create index submissions_rate_idx on public.submissions (ip_hash, created_at desc);

-- Admin allowlist ----------------------------------------------------------
-- Keyed by email so an allowlisted leader becomes an admin on first sign-in,
-- rather than needing an account to exist before one can be granted.
create table public.admins (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

-- Lives in `private`, not `public`: PostgREST exposes `public` only, so this is
-- usable by RLS policies but not callable over the REST API. It is SECURITY
-- DEFINER by design, which is also why the admins policies below do not recurse.
create schema if not exists private;
revoke all on schema private from anon, authenticated;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger songs_touch_updated_at
  before update on public.songs
  for each row execute function public.touch_updated_at();

-- Row level security -------------------------------------------------------
alter table public.tags        enable row level security;
alter table public.songs       enable row level security;
alter table public.submissions enable row level security;
alter table public.admins      enable row level security;

create policy tags_public_read on public.tags
  for select to anon, authenticated using (true);
create policy tags_admin_write on public.tags
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy songs_public_read on public.songs
  for select to anon, authenticated using (published);
create policy songs_admin_all on public.songs
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- No anon policy at all: the public can neither read nor write submissions
-- directly. Inserts go through submit_song() below.
create policy submissions_admin_all on public.submissions
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy admins_read on public.admins
  for select to authenticated using (private.is_admin());
create policy admins_write on public.admins
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Public submission entry point --------------------------------------------
-- A function rather than a table grant, so anon never holds insert rights and
-- the validation and rate limit cannot be bypassed by calling PostgREST
-- directly. This is why the app needs no service-role key.
create or replace function public.submit_song(
  p_title    text,
  p_tag      text,
  p_tune     text,
  p_body     text,
  p_name     text,
  p_email    text,
  p_note     text,
  p_ip_hash  text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
  v_tag    text;
begin
  p_title := btrim(coalesce(p_title, ''));
  p_body  := btrim(coalesce(p_body, ''));

  if p_title = '' or char_length(p_title) > 120 then
    raise exception 'invalid_title';
  end if;

  if char_length(p_body) < 20 or char_length(p_body) > 8000 then
    raise exception 'invalid_body';
  end if;

  -- Five songs an hour from one source is plenty for a leader typing up a set.
  select count(*) into v_recent
  from public.submissions
  where ip_hash = p_ip_hash
    and created_at > now() - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'rate_limited';
  end if;

  -- Only a tag that actually exists is accepted; anything else becomes null.
  select slug into v_tag from public.tags where slug = p_tag;

  insert into public.submissions
    (title, tag, tune, body, submitter_name, submitter_email, submitter_note, ip_hash, status)
  values (
    p_title,
    v_tag,
    nullif(btrim(coalesce(p_tune, '')), ''),
    p_body,
    nullif(btrim(coalesce(p_name, '')), ''),
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_note, '')), ''),
    nullif(btrim(coalesce(p_ip_hash, '')), ''),
    'pending'
  );
end;
$$;

revoke all on function public.submit_song(text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_song(text, text, text, text, text, text, text, text) to anon, authenticated;

-- Seed the first administrator (change this address).
insert into public.admins (email, note) values ('adam@thegallards.co.uk', 'Initial administrator');
