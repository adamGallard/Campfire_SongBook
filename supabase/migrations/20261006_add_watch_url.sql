-- Watch it tied: a link from a knot or lashing to an animation of it being
-- tied, on Animated Knots (animatedknots.com), who have said yes to us linking
-- to them. A link only: nothing of theirs is copied, embedded or hosted here.
--
-- Apply this before deploying the code that reads it: the public book asks
-- for the column by name, and fails to load without it.

alter table public.items
  add column watch_url text,
  add constraint items_watch_url_https
    check (watch_url is null or (watch_url ~ '^https://[^\s<>"]+$' and length(watch_url) <= 500));
