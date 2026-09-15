-- Campfire Songbook — full schema as applied to the `campfire-songbook`
-- Supabase project. Run this against an empty database to recreate it, then
-- load the seeds in supabase/seed (songs, skits, yarns, applause).
--
-- Applied as migrations:
--   20260912003502_create_songbook_schema
--   20260912004436_add_submission_rate_limit
--   20260912005206_add_submit_song_rpc
--   20260912005745_admins_keyed_by_email
--   20260912010114_move_is_admin_to_private_schema
--   20260912_admins_keyed_by_email / add_admin_email_exists_check
--   20260912_generalise_songs_to_items_with_kinds
--   20260912_submit_song_accepts_kind
--   20260913_add_applause_tags / kinds_carry_their_own_wording
--   20260915_add_yarns_section
--   20260915_raise_submission_body_limit

-- Sections of the book -----------------------------------------------------
-- Each kind carries its own wording, because deriving copy off the section
-- name gives you "16 applause for the fire" and "Submit a applause".
create table public.kinds (
  slug        text primary key,
  label       text not null,          -- switcher: "Songs"
  heading     text not null,          -- hero second line: "Song Book", "Applause"
  singular    text not null,          -- the noun a leader uses: "song", "cheer"
  plural      text not null,          -- "songs", "cheers"
  lede        text,                   -- section blurb on the public page
  sort_order  integer not null default 0,
  enabled     boolean not null default true
);

insert into public.kinds (slug, label, heading, singular, plural, lede, sort_order, enabled) values
  ('song', 'Songs', 'Song Book', 'song', 'songs',
   'Search for one, or scroll from the loud ones at the top to the quiet ones at the end.', 1, true),
  ('skit', 'Skits', 'Skit Book', 'skit', 'skits',
   'Filter by how many scouts you have got, or search for one you remember.', 2, true),
  ('yarn', 'Yarns', 'Yarns', 'yarn', 'yarns',
   'Start with a join-in one, save the quiet ones for last, or search for one you half remember.', 3, true),
  ('applause', 'Applause', 'Applause', 'cheer', 'cheers',
   'Quick cheers to throw between acts.', 4, true);

-- Tags (the filter chips), scoped per kind: "Loud" means nothing to a skit.
create table public.tags (
  slug        text not null,
  kind        text not null references public.kinds(slug) on update cascade,
  label       text not null,
  sort_order  integer not null default 0,
  primary key (kind, slug)
);

insert into public.tags (kind, slug, label, sort_order) values
  ('song', 'loud',    'Loud',    1),
  ('song', 'actions', 'Actions', 2),
  ('song', 'echo',    'Echo',    3),
  ('song', 'round',   'Rounds',  4),
  ('song', 'quiet',   'Quiet',   5),
  ('skit', 'small',  '2–3 scouts', 1),
  ('skit', 'medium', '4–6 scouts', 2),
  ('skit', 'large',  '7+ scouts',  3),
  ('yarn', 'join-in', 'Join in', 1),
  ('yarn', 'funny',   'Funny',   2),
  ('yarn', 'spooky',  'Spooky',  3),
  ('yarn', 'quiet',   'Quiet',   4),
  ('applause', 'quick',   'Quick',     1),
  ('applause', 'actions', 'Actions',   2),
  ('applause', 'build',   'Builds up', 3),
  ('applause', 'daft',    'Daft',      4);

-- Items (songs, skits, applause) -------------------------------------------
-- `blocks` holds the body as structured JSON rather than HTML, so nothing a
-- submitter types is ever rendered as markup. See lib/types.ts for the shape.
create table public.items (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  kind            text not null default 'song' references public.kinds(slug) on update cascade,
  tag             text not null,
  category_label  text,
  tune            text,
  blocks          jsonb not null default '[]'::jsonb,
  sort_order      integer not null default 0,
  published       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint items_blocks_is_array check (jsonb_typeof(blocks) = 'array'),
  constraint items_tag_fkey foreign key (kind, tag) references public.tags(kind, slug) on update cascade
);

create index items_sort_idx on public.items (sort_order);
create index items_kind_sort_idx on public.items (kind, sort_order);
create index items_published_idx on public.items (published) where published;

-- Public submissions -------------------------------------------------------
create table public.submissions (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  kind               text not null default 'song' references public.kinds(slug) on update cascade,
  tag                text,
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
  published_song_id  uuid references public.items(id) on delete set null,
  constraint submissions_tag_fkey foreign key (kind, tag) references public.tags(kind, slug) on update cascade,
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
  before update on public.items
  for each row execute function public.touch_updated_at();

-- Row level security -------------------------------------------------------
alter table public.tags        enable row level security;
alter table public.items       enable row level security;
alter table public.kinds       enable row level security;
alter table public.submissions enable row level security;
alter table public.admins      enable row level security;

create policy tags_public_read on public.tags
  for select to anon, authenticated using (true);
create policy tags_admin_write on public.tags
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy kinds_public_read on public.kinds
  for select to anon, authenticated using (true);
create policy kinds_admin_write on public.kinds
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy items_public_read on public.items
  for select to anon, authenticated using (published);
create policy items_admin_all on public.items
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
  p_ip_hash  text,
  p_kind     text default 'song'
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
  v_tag    text;
  v_kind   text;
begin
  p_title := btrim(coalesce(p_title, ''));
  p_body  := btrim(coalesce(p_body, ''));

  if p_title = '' or char_length(p_title) > 120 then
    raise exception 'invalid_title';
  end if;

  -- A long yarn runs to a few thousand words.
  if char_length(p_body) < 20 or char_length(p_body) > 20000 then
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

  -- Only a section that exists and is switched on; otherwise fall back to song.
  select slug into v_kind from public.kinds where slug = p_kind and enabled;
  if v_kind is null then
    v_kind := 'song';
  end if;

  -- Only a tag that belongs to that section; anything else becomes null.
  select slug into v_tag from public.tags where slug = p_tag and kind = v_kind;

  insert into public.submissions
    (title, kind, tag, tune, body, submitter_name, submitter_email, submitter_note, ip_hash, status)
  values (
    p_title,
    v_kind,
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

revoke all on function public.submit_song(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_song(text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- Seed the first administrator (change this address).
insert into public.admins (email, note) values ('adam@thegallards.co.uk', 'Initial administrator');
