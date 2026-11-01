/**
 * A plan made shareable: the running order, a title and a group.
 *
 * Normally it is stored in the database under a five-letter code and opened at
 * /p/KDRTM (shared_plans, supabase/migrations/20261101_add_shared_plans.sql). If
 * that cannot be done, the planner falls back to putting the whole plan in the
 * address of /plan/view, which stores nothing and needs no database but makes a
 * long link. Both show the book as it is now, so an edit shows up for everyone.
 */
export interface SharedPlan {
  title: string;
  group: string;
  /** Item slugs, in running order. */
  slugs: string[];
}

/** The same limits as the title and group boxes on the planner. */
const MAX_TEXT = 60;
/** The database refuses more; a QR code gets hard to scan well before this. */
export const MAX_ITEMS = 100;
/** Slugs are lower-case words joined by hyphens (slugify in lib/blocks.ts). */
const SLUG = /^[a-z0-9-]{1,100}$/;

/**
 * The letters a code is made from, which must match create_shared_plan in the
 * database. Consonants only, so a code can never spell a word, and none that
 * are easily misread when read out or typed from a slide.
 */
export const CODE = /^[BCDFGHJKLMNPRSTVWXZ]{5}$/;

/** A code as typed or scanned, or null if it cannot be one. */
export function readCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return CODE.test(code) ? code : null;
}

/** The address of a stored plan, e.g. `/p/KDRTM`. */
export const codePath = (code: string) => `/p/${code}`;

/** Anything unexpected dropped: used on what arrives from an address or a request. */
export function cleanPlan(title: unknown, group: unknown, slugs: unknown): SharedPlan {
  const text = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, MAX_TEXT) : '');
  const list = Array.isArray(slugs) ? slugs : [];
  const clean = list
    .filter((s): s is string => typeof s === 'string' && SLUG.test(s))
    .slice(0, MAX_ITEMS);
  return { title: text(title), group: text(group), slugs: [...new Set(clean)] };
}

/** The path and query for a plan held in its own address: `/plan/view?t=Friday+fire&i=a.b.c`. */
export function planPath(plan: SharedPlan): string {
  const params = new URLSearchParams();
  const title = plan.title.trim();
  const group = plan.group.trim();
  if (title) params.set('t', title);
  if (group) params.set('g', group);
  // A full stop is left as it is by URLSearchParams, and is not in a slug.
  params.set('i', plan.slugs.join('.'));
  return `/plan/view?${params}`;
}

/** What such an address says. */
export function readPlan(params: { get(name: string): string | null }): SharedPlan {
  return cleanPlan(params.get('t'), params.get('g'), (params.get('i') ?? '').split('.'));
}
