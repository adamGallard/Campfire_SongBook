/**
 * Which book this deploy is, and everything that differs between them.
 *
 * One codebase and one database serve two books: Campfire (songs, skits,
 * yarns, applause) and Pioneering (knots, lashings, builds, camp gadgets).
 * Each is its own Vercel project with its own domain, told apart by
 * NEXT_PUBLIC_BOOK. It is read at build time, so the pre-built pages, icons,
 * manifest and colours are all the right book's.
 *
 * Sections, tags and items are not here: they live in the database, where each
 * section (`kinds.book`) says which book it belongs to.
 */
export type BookSlug = 'campfire' | 'pioneering';

export const BOOK: BookSlug = process.env.NEXT_PUBLIC_BOOK === 'pioneering' ? 'pioneering' : 'campfire';

export interface Brand {
  slug: BookSlug;
  /** The app name after "ScoutBase". */
  name: string;
  /** Home-screen name, which has to fit under an icon. */
  shortName: string;
  description: string;
  /** Campfire is read round a real fire; pioneering happens by day. */
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
};

export const brand: Brand = BRANDS[BOOK];

/** "ScoutBase Campfire" */
export const appName = `ScoutBase ${brand.name}`;
