-- Harden submit_song.
--
-- Its rate limit counted rows by p_ip_hash, which the caller supplies, and
-- anon can call the function directly with the public key: a null or fresh
-- hash each time was never limited, and only the form checked the length of
-- the tune, name, email and note. The hash is now required, there is a ceiling
-- of fifty an hour across everyone, and the field limits are checked here too.
--
-- The signature is unchanged, so the deployed code needs nothing new.

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

  -- The form's limits on the other fields too, so calling this directly
  -- instead of going through the form gains nothing.
  if char_length(coalesce(p_tune, '')) > 200
     or char_length(coalesce(p_name, '')) > 80
     or char_length(coalesce(p_email, '')) > 160
     or char_length(coalesce(p_note, '')) > 1000 then
    raise exception 'invalid_body';
  end if;

  -- The hash comes from the caller, so it cannot be the only limit: a missing
  -- one never matches an earlier row, and a fresh one each time never repeats.
  -- It is required, and there is a ceiling across everyone as well.
  p_ip_hash := nullif(btrim(coalesce(p_ip_hash, '')), '');
  if p_ip_hash is null then
    raise exception 'rate_limited';
  end if;

  -- Five an hour from one source is plenty for a leader typing up a set.
  select count(*) into v_recent
  from public.submissions
  where ip_hash = p_ip_hash
    and created_at > now() - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'rate_limited';
  end if;

  -- Fifty an hour from everyone, across every book, is far beyond real use.
  select count(*) into v_recent
  from public.submissions
  where created_at > now() - interval '1 hour';

  if v_recent >= 50 then
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
    p_ip_hash,
    'pending'
  );
end;
$$;

revoke all on function public.submit_song(text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_song(text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
