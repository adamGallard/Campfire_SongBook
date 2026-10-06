/**
 * "Watch it tied": a link from a knot or lashing to an animation of it on
 * another site. Animated Knots have said yes to us linking to them; we link
 * only, and never copy, embed or host their animations.
 */

/** Sites we name in the link, by host. Anything else is named by its host. */
const SITES: Record<string, string> = {
  'animatedknots.com': 'Animated Knots',
};

/**
 * The URL as it should be stored, or null for a blank field. Throws a message
 * a leader can act on when it is not a plain https link.
 */
export function cleanWatchUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error('The animation link needs to be a full web address, starting https://');
  }
  if (url.protocol !== 'https:') {
    throw new Error('The animation link needs to start https://');
  }
  const href = url.toString();
  if (href.length > 500) throw new Error('That animation link is too long.');
  return href;
}

/** The site's name for the link text: "Animated Knots". */
export function watchSite(href: string): string | null {
  try {
    const host = new URL(href).hostname.replace(/^www\./, '');
    return SITES[host] ?? host;
  } catch {
    return null;
  }
}

/** The link as the book shows it, or null when there is none to show. */
export function watchLink(href: string | null | undefined): { href: string; site: string; short: string } | null {
  if (!href || !href.startsWith('https://')) return null;
  const site = watchSite(href);
  if (!site) return null;
  const short = href.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '');
  return { href, site, short };
}
