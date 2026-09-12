import type { Block } from './types';

/** Blank line separates verses; a leading "Chorus:" line labels one. */
const LABEL_RE = /^([A-Za-z][A-Za-z '-]{0,28}):\s*$/;

/**
 * Turn the plain text a submitter types into blocks.
 *
 * Rules kept deliberately forgiving, because this is filled in on a phone:
 *   - a blank line starts a new verse
 *   - a line that is just "Chorus:" labels the verse beneath it
 *   - a paragraph whose lines all start with "- " becomes a list box
 *   - a paragraph starting "Note:" becomes a note
 */
export function parseBody(body: string): Block[] {
  const paragraphs = body
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks: Block[] = [];

  for (const para of paragraphs) {
    const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const noteMatch = /^note:\s*/i.exec(lines[0]);
    if (noteMatch) {
      const text = [lines[0].slice(noteMatch[0].length), ...lines.slice(1)]
        .join('\n')
        .trim();
      if (text) blocks.push({ type: 'note', text });
      continue;
    }

    // The payoff line of a skit, set large and bold.
    const punchMatch = /^punchline:\s*/i.exec(lines[0]);
    if (punchMatch) {
      const text = [lines[0].slice(punchMatch[0].length), ...lines.slice(1)]
        .join('\n')
        .trim();
      if (text) blocks.push({ type: 'shout', text });
      continue;
    }

    // A list, optionally under a heading. The heading may name a layout so
    // that grids and chip rows survive a trip through the editor instead of
    // silently collapsing into a plain box.
    const listHead = /^(?:(.*?)\s*)?\[(box|columns|chips)\]\s*:?\s*$/i.exec(lines[0]);
    const bulleted = (ls: string[]) => ls.length > 0 && ls.every((l) => /^[-*]\s+/.test(l));
    const strip = (ls: string[]) => ls.map((l) => l.replace(/^[-*]\s+/, ''));

    if (listHead && bulleted(lines.slice(1))) {
      const heading = (listHead[1] ?? '').trim() || null;
      const layout = listHead[2].toLowerCase();
      const items = strip(lines.slice(1));
      if (layout === 'chips') blocks.push({ type: 'pills', items });
      else if (layout === 'columns') blocks.push({ type: 'grid', heading, items });
      else blocks.push({ type: 'box', heading, items });
      continue;
    }

    // "Heading:" followed by bullets, or bare bullets, is a plain box.
    const headed = LABEL_RE.exec(lines[0]);
    if (headed && bulleted(lines.slice(1))) {
      blocks.push({ type: 'box', heading: headed[1], items: strip(lines.slice(1)) });
      continue;
    }

    if (lines.length > 1 && bulleted(lines)) {
      blocks.push({ type: 'box', heading: null, items: strip(lines) });
      continue;
    }

    let label: string | undefined;
    let rest = lines;
    const m = LABEL_RE.exec(lines[0]);
    if (m && lines.length > 1) {
      label = m[1];
      rest = lines.slice(1);
    }

    const text = rest.join('\n').trim();
    if (!text) continue;
    blocks.push(label ? { type: 'verse', text, label } : { type: 'verse', text });
  }

  return blocks;
}

/** Render blocks back to the plain text the admin editor shows. */
export function blocksToBody(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'verse':
          return b.label ? `${b.label}:\n${b.text}` : b.text;
        case 'note':
          return `Note: ${b.text}`;
        // Must round-trip, or editing an item silently demotes its punchline
        // to an ordinary paragraph.
        case 'shout':
          return `Punchline: ${b.text}`;
        // The [layout] marker is what makes grids and chip rows survive an
        // edit; without it they would all come back as plain boxes.
        case 'box':
          return [b.heading ? `${b.heading}:` : null, ...b.items.map((i) => `- ${i}`)]
            .filter(Boolean)
            .join('\n');
        case 'grid':
          return [`${b.heading ?? ''} [columns]:`.trim(), ...b.items.map((i) => `- ${i}`)].join('\n');
        case 'pills':
          return ['[chips]:', ...b.items.map((i) => `- ${i}`)].join('\n');
      }
    })
    .join('\n\n');
}

const TYPES = new Set(['verse', 'note', 'shout', 'box', 'grid', 'pills']);

/**
 * Validate untrusted JSON into blocks. Anything unrecognised is dropped rather
 * than trusted, so a hand-edited payload cannot smuggle fields through.
 */
export function sanitizeBlocks(input: unknown): Block[] {
  if (!Array.isArray(input)) return [];
  const out: Block[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const b = raw as Record<string, unknown>;
    const type = typeof b.type === 'string' ? b.type : '';
    if (!TYPES.has(type)) continue;

    if (type === 'verse' || type === 'note' || type === 'shout') {
      const text = typeof b.text === 'string' ? b.text.trim() : '';
      if (!text) continue;
      if (type === 'verse') {
        const label = typeof b.label === 'string' ? b.label.trim() : '';
        out.push(label ? { type, text, label } : { type, text });
      } else {
        out.push({ type, text });
      }
      continue;
    }

    const items = Array.isArray(b.items)
      ? b.items.filter((i): i is string => typeof i === 'string').map((i) => i.trim()).filter(Boolean)
      : [];
    if (!items.length) continue;

    if (type === 'pills') {
      out.push({ type, items });
    } else {
      const heading = typeof b.heading === 'string' && b.heading.trim() ? b.heading.trim() : null;
      out.push({ type: type as 'box' | 'grid', heading, items });
    }
  }

  return out;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Plain text of a song, used for search. */
export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((b) => ('text' in b ? b.text : '') + ('items' in b ? ' ' + b.items.join(' ') : '') +
      ('heading' in b && b.heading ? ' ' + b.heading : '') +
      ('label' in b && b.label ? ' ' + b.label : ''))
    .join(' ');
}
