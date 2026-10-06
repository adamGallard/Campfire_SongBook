-- Bushcraft: a third book in the same database, alongside Campfire and
-- Pioneering. It starts with one section, fire lighting, and gets more
-- (shelters, water, tools…) as rows here when there is content for them.
--
-- Safe to apply before the code that uses it is deployed: nothing on the
-- Campfire or Pioneering sites changes, and the new section goes in switched
-- off until its first items have been checked by someone who teaches fire
-- lighting. submit_song needs no change: it already files a submission only
-- under a switched-on section of the book it is given.

insert into public.books (slug, name, sort_order) values
  ('bushcraft', 'Bushcraft', 3)
on conflict (slug) do nothing;

insert into public.kinds (slug, label, heading, singular, plural, lede, sort_order, enabled, book) values
  ('fire', 'Fire', 'Fire lighting', 'fire skill', 'fire skills',
   'Fire without matches or lighters. Read fire safety first, then start with the bow drill: once you can make an ember with it, the others come faster.',
   1, false, 'bushcraft')
on conflict (slug) do nothing;

insert into public.tags (kind, slug, label, sort_order) values
  ('fire', 'basics',     'Before you start', 1),
  ('fire', 'friction',   'Friction', 2),
  ('fire', 'percussion', 'Sparks', 3)
on conflict (kind, slug) do nothing;
