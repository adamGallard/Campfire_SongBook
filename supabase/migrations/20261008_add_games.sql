-- Games: a fourth book in the same database, alongside Campfire, Pioneering
-- and Bushcraft. Eight sections, each switched off until its first items have
-- been checked by a leader (open flame, contact and water games in particular).
--
-- Safe to apply before the code that uses it is deployed: nothing on the other
-- three sites changes. submit_song needs no change: it already files a
-- submission only under a switched-on section of the book it is given.

insert into public.books (slug, name, sort_order) values
  ('games', 'Games', 4)
on conflict (slug) do nothing;

insert into public.kinds (slug, label, heading, singular, plural, lede, sort_order, enabled, book) values
  ('active', 'Active', 'Active games', 'active game', 'active games',
   'Tag, chasing and circle games to burn off energy. A good way to start a meeting.',
   1, false, 'games'),
  ('quiet', 'Quiet', 'Quiet games', 'quiet game', 'quiet games',
   'Listening, watching and remembering games to settle everyone down.',
   2, false, 'games'),
  ('relay', 'Relays', 'Relays', 'relay', 'relays',
   'Team races, from knot relays to water relays. Make the teams even first.',
   3, false, 'games'),
  ('wide', 'Wide games', 'Wide games', 'wide game', 'wide games',
   'Bigger games with teams and roles, played over a field or a campsite. Agree the boundaries first.',
   4, false, 'games'),
  ('water', 'Water', 'Water games', 'water game', 'water games',
   'Wet games for camp and hot days. Have towels, sunscreen and water to drink ready.',
   5, false, 'games'),
  ('challenge', 'Challenges', 'Team challenges', 'team challenge', 'team challenges',
   'Problems a patrol has to solve together. Talk about how it went afterwards.',
   6, false, 'games'),
  ('skills', 'Skills', 'Skills games', 'skills game', 'skills games',
   'Games that practise knots, compasses, Morse code and codes.',
   7, false, 'games'),
  ('drama', 'Drama', 'Drama games', 'drama game', 'drama games',
   'Improvised drama games, for skits and for fun.',
   8, false, 'games')
on conflict (slug) do nothing;

-- Filter chips: where a game can be played.
insert into public.tags (kind, slug, label, sort_order) values
  ('active', 'hall', 'Indoors', 1),
  ('active', 'outdoors', 'Outdoors', 2),
  ('active', 'anywhere', 'Anywhere', 3),
  ('quiet', 'hall', 'Indoors', 1),
  ('quiet', 'anywhere', 'Anywhere', 2),
  ('relay', 'hall', 'Indoors', 1),
  ('relay', 'outdoors', 'Outdoors', 2),
  ('relay', 'anywhere', 'Anywhere', 3),
  ('wide', 'outdoors', 'Outdoors', 1),
  ('water', 'outdoors', 'Outdoors', 1),
  ('challenge', 'hall', 'Indoors', 1),
  ('challenge', 'outdoors', 'Outdoors', 2),
  ('challenge', 'anywhere', 'Anywhere', 3),
  ('skills', 'hall', 'Indoors', 1),
  ('skills', 'outdoors', 'Outdoors', 2),
  ('skills', 'anywhere', 'Anywhere', 3),
  ('drama', 'hall', 'Indoors', 1)
on conflict (kind, slug) do nothing;
