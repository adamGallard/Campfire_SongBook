/**
 * Which book this deploy is, and everything that differs between them.
 *
 * One codebase and one database serve four books: Campfire (songs, skits,
 * yarns, applause), Pioneering (knots, lashings, builds, camp gadgets),
 * Bushcraft (fire lighting, and the skills to live well in the bush) and
 * Games (active, quiet, relay, wide, water and team games). Each is
 * its own Vercel project with its own domain, told apart by
 * NEXT_PUBLIC_BOOK. It is read at build time, so the pre-built pages, icons,
 * manifest and colours are all the right book's.
 *
 * Sections, tags and items are not here: they live in the database, where each
 * section (`kinds.book`) says which book it belongs to.
 */
export type BookSlug = 'campfire' | 'pioneering' | 'bushcraft' | 'games';

const SLUGS: BookSlug[] = ['campfire', 'pioneering', 'bushcraft', 'games'];
const env = process.env.NEXT_PUBLIC_BOOK as BookSlug | undefined;

export const BOOK: BookSlug = env && SLUGS.includes(env) ? env : 'campfire';

export interface Brand {
  slug: BookSlug;
  /** The app name after "ScoutBase". */
  name: string;
  /** Home-screen name, which has to fit under an icon. */
  shortName: string;
  description: string;
  /** Where the book lives, for links from the other books. */
  url: string;
  /** One line for a link to this book from the other books' footers. */
  blurb: string;
  /** Campfire is read round a real fire; pioneering, bushcraft and games happen by day. */
  defaultMode: 'night' | 'day';
  /** Splash-screen ground behind the icon when it opens from a home screen. */
  background: string;
  /** Said after the count in the hero: "12 songs for the fire." */
  countSuffix: string;
  intro: {
    title: string;
    lede: string;
    search: string;
    /** What night mode is for, after "Night mode (the moon, top right)". */
    night: string;
    plan: string;
  };
  plan: {
    label: string;
    lede: string;
    description: string;
    /** The PDF's title when more than one section is in it. */
    pdfTitle: string;
    /** The small line above the title on the PDF cover. */
    coverKicker: string;
  };
  submit: {
    lede: string;
    description: string;
  };
}

const BRANDS: Record<BookSlug, Brand> = {
  campfire: {
    slug: 'campfire',
    name: 'Campfire',
    shortName: 'SB Campfire',
    url: 'https://campfire.scoutbase.app',
    blurb: 'Songs, skits, yarns and cheers for around the fire.',
    description:
      'Songs, skits, yarns and cheers for the campfire. Search every line, read it round a real fire, and print your own booklet.',
    defaultMode: 'night',
    background: '#0D1B2A',
    countSuffix: ' for the fire',
    intro: {
      title: 'A campfire book for Scout groups',
      lede: 'Songs to sing, skits to perform, yarns to tell, and cheers for the gaps in between. Pick a section above.',
      search:
        'looks inside every song, script and story, not just the titles — so half a remembered line is enough.',
      night: 'keeps the screen dim round a real fire',
      plan: 'pick the ones you want, put them in order, and print them as A4 pages or a booklet to fold and staple.',
    },
    plan: {
      label: 'Plan a campfire',
      lede: 'Pick the songs, skits, yarns and cheers for your campfire, put them in order, then print them as A4 pages or as a booklet to fold and staple.',
      description:
        'Pick the songs, skits, yarns and cheers for your campfire, put them in order, and print them as A4 pages or a folded A5 booklet.',
      pdfTitle: 'Campfire Book',
      coverKicker: 'Sing loud · laugh often',
    },
    submit: {
      lede: 'Know a song, a skit, a yarn or a cheer that belongs round the fire? Send it in and a leader will review it before it joins the book.',
      description: 'Send a campfire song, skit, yarn or cheer in for a leader to review.',
    },
  },
  pioneering: {
    slug: 'pioneering',
    name: 'Pioneering',
    shortName: 'SB Pioneering',
    url: 'https://pioneering.scoutbase.app',
    blurb: 'Knots, lashings, builds and camp gadgets, step by step.',
    description:
      'Knots, lashings and builds for Scout groups, step by step. Search every step, follow it with rope in your hands, and print cards and build sheets.',
    defaultMode: 'day',
    background: '#F7FAF8',
    countSuffix: '',
    intro: {
      title: 'A pioneering book for Scout groups',
      lede: 'The knots and lashings a Scout needs, the builds they go into, and the gadgets that make a campsite work. Pick a section above.',
      search:
        'looks inside every step and kit list, not just the titles — so "shear" finds every build that uses a shear lashing.',
      night: 'is easier on the eyes in a dark hall or a tent',
      plan: 'pick the knots and builds for your camp or meeting, put them in order, and print them as A4 sheets or a booklet.',
    },
    plan: {
      label: 'Plan a build',
      lede: 'Pick the knots, lashings and builds for your camp or meeting, put them in order, then print them as A4 sheets or as a booklet to fold and staple.',
      description:
        'Pick the knots, lashings and builds for your camp or meeting, put them in order, and print them as A4 sheets or a folded A5 booklet.',
      pdfTitle: 'Pioneering Book',
      coverKicker: 'Tie it tight · check it twice',
    },
    submit: {
      lede: 'Know a knot, a lashing or a build that belongs in the book? Send it in and a leader will check it before it joins the book.',
      description: 'Send a knot, lashing, build or camp gadget in for a leader to check.',
    },
  },
  bushcraft: {
    slug: 'bushcraft',
    name: 'Bushcraft',
    shortName: 'SB Bushcraft',
    url: 'https://bushcraft.scoutbase.app',
    blurb: 'Fire without matches, and the skills to live well in the bush.',
    description:
      'Bushcraft for Scout groups, step by step: fire without matches, and the skills to live well in the bush. Search every step, and print cards for your next camp.',
    defaultMode: 'day',
    background: '#F7FAF8',
    countSuffix: '',
    intro: {
      title: 'A bushcraft book for Scout groups',
      lede: 'Skills for living well in the bush, starting with fire: how to light one without matches or lighters, and how to keep it safe. Pick a section above.',
      search:
        'looks inside every step and kit list, not just the titles — so "hearth board" finds every method that uses one.',
      night: 'is easier on the eyes in a tent or by the fire',
      plan: 'pick the skills for your camp or meeting, put them in order, and print them as A4 sheets or a booklet.',
    },
    plan: {
      label: 'Plan a session',
      lede: 'Pick the skills for your camp or meeting, put them in order, then print them as A4 sheets or as a booklet to fold and staple.',
      description:
        'Pick the bushcraft skills for your camp or meeting, put them in order, and print them as A4 sheets or a folded A5 booklet.',
      pdfTitle: 'Bushcraft Book',
      coverKicker: 'Practise often · put it out cold',
    },
    submit: {
      lede: 'Know a bushcraft skill that belongs in the book? Send it in and a leader will check it before it joins the book.',
      description: 'Send a bushcraft skill in for a leader to check.',
    },
  },
  games: {
    slug: 'games',
    name: 'Games',
    shortName: 'SB Games',
    url: 'https://games.scoutbase.app',
    blurb: 'Active, quiet, relay and team games for the hall and the field.',
    description:
      'Games for Scout groups, step by step: active and quiet games, relays, wide games, water games and team challenges. Search every game, check the kit, and print cards for your next meeting.',
    defaultMode: 'day',
    background: '#F7FAF8',
    countSuffix: '',
    intro: {
      title: 'A games book for Scout groups',
      lede: 'Games for every part of a meeting: something to burn off energy, something to settle everyone down, relays, wide games and challenges for a patrol. Pick a section above.',
      search:
        'looks inside every game and kit list, not just the titles, so "balloons" finds every game that needs them.',
      night: 'is easier on the eyes in a dark hall or a tent',
      plan: 'pick the games for your meeting or camp, put them in order, and print them as A4 sheets or a booklet.',
    },
    plan: {
      label: 'Plan a meeting',
      lede: 'Pick the games for your meeting or camp, put them in order, then print them as A4 sheets or as a booklet to fold and staple.',
      description:
        'Pick the games for your meeting or camp, put them in order, and print them as A4 sheets or a folded A5 booklet.',
      pdfTitle: 'Games Book',
      coverKicker: 'Play fair · play often',
    },
    submit: {
      lede: 'Know a game that belongs in the book? Send it in and a leader will check it before it joins the book.',
      description: 'Send a game in for a leader to check.',
    },
  },
};

export const brand: Brand = BRANDS[BOOK];

/** The other books, for linking to from this one. */
export const otherBrands: Brand[] = Object.values(BRANDS).filter((b) => b.slug !== BOOK);

/** "ScoutBase Campfire" */
export const appName = `ScoutBase ${brand.name}`;
