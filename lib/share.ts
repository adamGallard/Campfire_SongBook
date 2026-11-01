/**
 * A plan made shareable: the running order, a title and a group, packed into
 * the address of /plan/view. Nothing is stored anywhere, so a link needs no
 * database and no sign-in, and the page it opens always shows the book as it is
 * now. The cost is that a long plan makes a long address; slugs keep it short.
 */
export interface SharedPlan {
  title: string;
  group: string;
  /** Item slugs, in running order. */
  slugs: string[];
}

/** The same limits as the title and group boxes on the planner. */
const MAX_TEXT = 60;
/** A QR code gets hard to scan well before this; it only stops silly addresses. */
const MAX_ITEMS = 200;
/** Slugs are lower-case words joined by hyphens (slugify in lib/blocks.ts). */
const SLUG = /^[a-z0-9-]{1,100}$/;

/** The path and query for a plan, e.g. `/plan/view?t=Friday+fire&i=a.b.c`. */
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

/** What an address says, trusting none of it: anything unexpected is dropped. */
export function readPlan(params: { get(name: string): string | null }): SharedPlan {
  const text = (name: string) => (params.get(name) ?? '').trim().slice(0, MAX_TEXT);
  const slugs = (params.get('i') ?? '')
    .split('.')
    .filter((s) => SLUG.test(s))
    .slice(0, MAX_ITEMS);
  return { title: text('t'), group: text('g'), slugs: [...new Set(slugs)] };
}
