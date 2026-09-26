-- Books: one database, more than one book. Campfire (songs, skits, yarns,
-- applause) and Pioneering (knots, lashings, builds, camp gadgets) share the
-- tables, and each section says which book it belongs to. Items, tags and
-- submissions already hang off a section, so they follow it.
--
-- Safe to apply before the code that uses it is deployed: every existing
-- section defaults to the campfire book, the new sections go in switched off,
-- and submit_song keeps accepting the arguments the live site sends today.

create table public.books (
  slug        text primary key,
  name        text not null,          -- the app name after "ScoutBase": "Campfire"
  sort_order  integer not null default 0
);

insert into public.books (slug, name, sort_order) values
  ('campfire',   'Campfire',   1),
  ('pioneering', 'Pioneering', 2);

alter table public.books enable row level security;

create policy books_public_read on public.books
  for select to anon, authenticated using (true);
create policy books_admin_write on public.books
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

alter table public.kinds
  add column book text not null default 'campfire'
    references public.books(slug) on update cascade;

create index kinds_book_sort_idx on public.kinds (book, sort_order);

-- Pioneering sections go in switched off, as every new section does, until
-- their first items have been checked by someone who teaches pioneering.
insert into public.kinds (slug, label, heading, singular, plural, lede, sort_order, enabled, book) values
  ('knot', 'Knots', 'Knots', 'knot', 'knots',
   'Start with the clove hitch: it begins and ends nearly every lashing.', 1, false, 'pioneering'),
  ('lashing', 'Lashings', 'Lashings', 'lashing', 'lashings',
   'How to join two spars, or three, so they stay joined when someone leans on them.', 2, false, 'pioneering'),
  ('build', 'Builds', 'Builds', 'build', 'builds',
   'Frames, bridges and towers, each with its kit list, the lashings it uses and a safety check.', 3, false, 'pioneering'),
  ('gadget', 'Camp gadgets', 'Camp gadgets', 'gadget', 'gadgets',
   'Small builds that make a campsite work: somewhere to wash, to hang things, to keep the kitchen off the ground.', 4, false, 'pioneering');

insert into public.tags (kind, slug, label, sort_order) values
  ('knot', 'hitch', 'Hitches', 1),
  ('knot', 'bend',  'Joining ropes', 2),
  ('knot', 'loop',  'Loops', 3),
  ('knot', 'binding', 'Binding', 4),
  ('lashing', 'right-angle', 'Right angles', 1),
  ('lashing', 'parallel',    'Side by side', 2),
  ('lashing', 'three',       'Three spars', 3),
  ('build', 'frame',  'Frames', 1),
  ('build', 'bridge', 'Bridges', 2),
  ('build', 'tower',  'Towers and poles', 3),
  ('gadget', 'kitchen', 'Camp kitchen', 1),
  ('gadget', 'site',    'Around the site', 2);

-- submit_song learns which book a submission is for. A section that is not
-- switched on, or belongs to another book, falls back to that book's first
-- section; a book with none switched on refuses the submission rather than
-- filing it somewhere it does not belong. The old nine-argument version is
-- dropped: callers that send nine named arguments get this one, with
-- p_book defaulting to campfire, so the live site keeps working.
drop function if exists public.submit_song(text, text, text, text, text, text, text, text, text);

create or replace function public.submit_song(
  p_title    text,
  p_tag      text,
  p_tune     text,
  p_body     text,
  p_name     text,
  p_email    text,
  p_note     text,
  p_ip_hash  text,
  p_kind     text default 'song',
  p_book     text default 'campfire'
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

  -- Five an hour from one source is plenty for a leader typing up a set.
  select count(*) into v_recent
  from public.submissions
  where ip_hash = p_ip_hash
    and created_at > now() - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'rate_limited';
  end if;

  -- Only a section of this book that is switched on; otherwise the book's first.
  select slug into v_kind from public.kinds
  where slug = p_kind and book = p_book and enabled;

  if v_kind is null then
    select slug into v_kind from public.kinds
    where book = p_book and enabled
    order by sort_order
    limit 1;
  end if;

  if v_kind is null then
    raise exception 'invalid_kind';
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

revoke all on function public.submit_song(text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_song(text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
