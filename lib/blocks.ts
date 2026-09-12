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

    if (lines.length > 1 && lines.every((l) => /^[-*]\s+/.test(l))) {
      blocks.push({
        type: 'box',
        heading: null,
        items: lines.map((l) => l.replace(/^[-*]\s+/, '')),
      });
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
        case 'shout':
          return b.text;
        case 'box':
        case 'grid':
          return [b.heading ? `${b.heading}:` : null, ...b.items.map((i) => `- ${i}`)]
            .filter(Boolean)
            .join('\n');
        case 'pills':
          return b.items.map((i) => `- ${i}`).join('\n');
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
