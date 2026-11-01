-- Shared plans: a five-letter code for a plan.
--
-- "Create link" on the planner used to put the whole plan in the address, which
-- made for a long link and a dense QR code. Now the plan is stored here under a
-- short code (campfire.scoutbase.app/p/KDRTM). The long address still works and
-- is what the planner falls back to if this has not been applied, so applying
-- it before or after deploying the code is safe.
--
-- The table has RLS on and no policy at all: the public can neither read nor
-- write it directly. Everything goes through the two functions below, as with
-- submit_song, so the checks and the rate limit cannot be skipped by calling
-- PostgREST directly.
--
-- What is stored is a title, a group name and a list of item slugs: nothing
-- anyone could not already see in the book, and only slugs of published items
-- in this book are accepted.

create table if not exists public.shared_plans (
  code        text primary key check (code ~ '^[BCDFGHJKLMNPRSTVWXZ]{5}$'),
  book        text not null references public.books(slug) on update cascade,
  title       text not null default '' check (char_length(title) <= 60),
  group_name  text not null default '' check (char_length(group_name) <= 60),
  slugs       text[] not null check (cardinality(slugs) between 1 and 100),
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists shared_plans_rate_idx on public.shared_plans (ip_hash, created_at desc);

alter table public.shared_plans enable row level security;

-- Store a plan and hand back its code. p_ip_hash is a salted hash made by the
-- app (never an address), used for the rate limit.
create or replace function public.create_shared_plan(
  p_book     text,
  p_title    text,
  p_group    text,
  p_slugs    text[],
  p_ip_hash  text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Consonants only, and no Q, so a code can never spell a word, and nothing
  -- that is easily misread when it is read out or typed from a slide.
  v_alphabet constant text := 'BCDFGHJKLMNPRSTVWXZ';
  v_recent   integer;
  v_slugs    text[];
  v_code     text;
  v_try      integer := 0;
begin
  p_title := btrim(coalesce(p_title, ''));
  p_group := btrim(coalesce(p_group, ''));

  if char_length(p_title) > 60 or char_length(p_group) > 60 then
    raise exception 'invalid_plan';
  end if;

  p_ip_hash := nullif(btrim(coalesce(p_ip_hash, '')), '');
  if p_ip_hash is null then
    raise exception 'rate_limited';
  end if;

  -- Twenty an hour from one source is far more than a leader plans in an
  -- evening; two hundred an hour from everyone is far beyond real use.
  select count(*) into v_recent
  from public.shared_plans
  where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
  if v_recent >= 20 then
    raise exception 'rate_limited';
  end if;

  select count(*) into v_recent
  from public.shared_plans
  where created_at > now() - interval '1 hour';
  if v_recent >= 200 then
    raise exception 'rate_limited';
  end if;

  -- Only published items in this book's switched-on sections, each once, in the
  -- order given. Anything else is dropped, and a plan with nothing left is no plan.
  select coalesce(array_agg(s.slug order by s.ord), '{}') into v_slugs
  from (
    select distinct on (u.slug) u.slug, u.ord
    from unnest(coalesce(p_slugs, '{}')) with ordinality as u(slug, ord)
    join public.items i on i.slug = u.slug and i.published
    join public.kinds k on k.slug = i.kind and k.book = p_book and k.enabled
    order by u.slug, u.ord
  ) s;

  if cardinality(v_slugs) = 0 or cardinality(v_slugs) > 100 then
    raise exception 'invalid_plan';
  end if;

  -- A free code, found by guessing: there are 2.5 million, so a clash is rare.
  loop
    v_try := v_try + 1;
    v_code := '';
    for n in 1..5 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;

    begin
      insert into public.shared_plans (code, book, title, group_name, slugs, ip_hash)
      values (v_code, p_book, p_title, p_group, v_slugs, p_ip_hash);
      return v_code;
    exception when unique_violation then
      if v_try >= 10 then
        raise exception 'no_code';
      end if;
    end;
  end loop;
end;
$$;

-- Read a plan back by its code, only on the book it was made in.
create or replace function public.get_shared_plan(p_code text, p_book text)
returns table (title text, group_name text, slugs text[])
language sql
stable
security definer
set search_path = ''
as $$
  select p.title, p.group_name, p.slugs
  from public.shared_plans p
  where p.code = upper(btrim(coalesce(p_code, ''))) and p.book = p_book;
$$;

revoke all on function public.create_shared_plan(text, text, text, text[], text) from public;
grant execute on function public.create_shared_plan(text, text, text, text[], text) to anon, authenticated;

revoke all on function public.get_shared_plan(text, text) from public;
grant execute on function public.get_shared_plan(text, text) to anon, authenticated;
