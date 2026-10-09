-- Two optional filters for items, used by the Games book: who a game is for,
-- and which group sizes it suits. Null means "not set", so every other book is
-- unaffected, and a game with no sizes is never hidden by the size filter.
alter table public.items
  add column if not exists age text
    check (age is null or age in ('cubs', 'scouts', 'both')),
  add column if not exists group_sizes text[]
    check (group_sizes is null or group_sizes <@ array['small', 'patrol', 'large']);
