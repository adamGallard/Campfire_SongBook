import type { Block, KitLine } from './types';

/** Blank line separates verses; a leading "Chorus:" line labels one. */
const LABEL_RE = /^([A-Za-z][A-Za-z '-]{0,28}):\s*$/;

/** "1. " or "1) " at the start of a line: a step. */
const STEP_RE = /^\d{1,2}[.)]\s+/;

/** Headings that make a list a kit list or a safety check without a marker. */
const KIT_HEAD = /^(kit|you need|you will need|kit list)$/i;
const SAFETY_HEAD = /^(safety|safety check|before you build|before you start)$/i;

/** Units that make a leading number a measurement, not a count: "12 mm rope". */
const UNIT_RE = /^(?:mm|cm|m|km|metres?|meters?|in|inch(?:es)?|ft|feet|foot|kg|g)\b/i;

/**
 * "2 × Spars, 2.4 m", "2 x spars" or "2 spars"; anything else has no count.
 * A line that starts with a measurement ("2.4 m rope", "12 mm rope") or a
 * size ("2x4 timber") keeps its number as part of the item.
 */
export function kitLine(text: string): KitLine {
  const line = text.trim();
  // An explicit count: "2 × …", or "2 x …" with a space after the x.
  const times = /^(\d{1,3})\s*(?:×|[xX](?=\s))\s*(\S.*)$/.exec(line);
  if (times) return { qty: Number(times[1]), item: times[2].trim() };
  // A bare whole number, then a word that is not a unit: "3 lashing ropes".
  const bare = /^(\d{1,3})\s+(\S.*)$/.exec(line);
  if (bare && !UNIT_RE.test(bare[2])) return { qty: Number(bare[1]), item: bare[2].trim() };
  return { qty: null, item: line };
}

/** Back to the line a leader types: "2 × Spars, 2.4 m". */
export function kitText(line: KitLine): string {
  return line.qty === null ? line.item : `${line.qty} × ${line.item}`;
}

/**
 * Turn the plain text a submitter types into blocks.
 *
 * Rules kept deliberately forgiving, because this is filled in on a phone:
 *   - a blank line starts a new verse
 *   - a line that is just "Chorus:" labels the verse beneath it
 *   - a paragraph whose lines all start with "- " becomes a list box
 *   - a paragraph starting "Note:" becomes a note
 *   - a paragraph of numbered lines ("1. …") becomes steps
 *   - "Kit:" over a list becomes a kit list, "- 2 × Spars, 2.4 m"
 *   - "Safety:" over a list becomes a safety check
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
    const listHead = /^(?:(.*?)\s*)?\[(box|columns|chips|kit|safety|steps)\]\s*:?\s*$/i.exec(lines[0]);
    const bulleted = (ls: string[]) => ls.length > 0 && ls.every((l) => /^[-*]\s+/.test(l));
    const strip = (ls: string[]) => ls.map((l) => l.replace(/^[-*]\s+/, ''));
    const numbered = (ls: string[]) => ls.length > 0 && ls.every((l) => STEP_RE.test(l));
    const unnumber = (ls: string[]) => ls.map((l) => l.replace(STEP_RE, ''));

    if (listHead && (bulleted(lines.slice(1)) || numbered(lines.slice(1)))) {
      const heading = (listHead[1] ?? '').trim() || null;
      const layout = listHead[2].toLowerCase();
      const rest = lines.slice(1);
      const items = numbered(rest) ? unnumber(rest) : strip(rest);
      if (layout === 'chips') blocks.push({ type: 'pills', items });
      else if (layout === 'columns') blocks.push({ type: 'grid', heading, items });
      else if (layout === 'kit') blocks.push({ type: 'kit', heading, items: items.map(kitLine) });
      else if (layout === 'safety') blocks.push({ type: 'safety', heading, items });
      else if (layout === 'steps') blocks.push({ type: 'steps', heading, items });
      else blocks.push({ type: 'box', heading, items });
      continue;
    }

    // Numbered lines are steps, under an optional "Heading:".
    const stepHead = LABEL_RE.exec(lines[0]);
    if (numbered(lines) || (stepHead && numbered(lines.slice(1)))) {
      const heading = numbered(lines) ? null : stepHead![1];
      blocks.push({ type: 'steps', heading, items: unnumber(numbered(lines) ? lines : lines.slice(1)) });
      continue;
    }

    // "Heading:" followed by bullets, or bare bullets, is a plain box, except
    // that "Kit:" and "Safety:" name their own blocks, since those are what a
    // leader will type without being told about [markers].
    const headed = LABEL_RE.exec(lines[0]);
    if (headed && bulleted(lines.slice(1))) {
      const heading = headed[1];
      const items = strip(lines.slice(1));
      if (KIT_HEAD.test(heading)) blocks.push({ type: 'kit', heading, items: items.map(kitLine) });
      else if (SAFETY_HEAD.test(heading)) blocks.push({ type: 'safety', heading, items });
      else blocks.push({ type: 'box', heading, items });
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
        // A heading the parser recognises on its own goes back plain; any
        // other keeps its [marker] so the block survives the edit.
        case 'steps':
          return [
            b.heading ? (LABEL_RE.test(`${b.heading}:`) ? `${b.heading}:` : `${b.heading} [steps]:`) : null,
            ...b.items.map((i, n) => `${n + 1}. ${i}`),
          ]
            .filter(Boolean)
            .join('\n');
        case 'kit':
          return [
            b.heading && KIT_HEAD.test(b.heading) ? `${b.heading}:` : `${b.heading ?? ''} [kit]:`.trim(),
            ...b.items.map((i) => `- ${kitText(i)}`),
          ].join('\n');
        case 'safety':
          return [
            b.heading && SAFETY_HEAD.test(b.heading) ? `${b.heading}:` : `${b.heading ?? ''} [safety]:`.trim(),
            ...b.items.map((i) => `- ${i}`),
          ].join('\n');
      }
    })
    .join('\n\n');
}

const TYPES = new Set(['verse', 'note', 'shout', 'box', 'grid', 'pills', 'steps', 'kit', 'safety']);

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

    const heading = typeof b.heading === 'string' && b.heading.trim() ? b.heading.trim() : null;

    if (type === 'kit') {
      const lines: KitLine[] = [];
      for (const raw of Array.isArray(b.items) ? b.items : []) {
        const line = (raw ?? {}) as Record<string, unknown>;
        const item = typeof line.item === 'string' ? line.item.trim() : '';
        if (!item) continue;
        const qty =
          typeof line.qty === 'number' && Number.isInteger(line.qty) && line.qty >= 0 && line.qty < 1000
            ? line.qty
            : null;
        lines.push({ qty, item });
      }
      if (lines.length) out.push({ type, heading, items: lines });
      continue;
    }

    const items = Array.isArray(b.items)
      ? b.items.filter((i): i is string => typeof i === 'string').map((i) => i.trim()).filter(Boolean)
      : [];
    if (!items.length) continue;

    if (type === 'pills') {
      out.push({ type, items });
    } else {
      out.push({ type: type as 'box' | 'grid' | 'steps' | 'safety', heading, items });
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

export type InlineRun = { style: 'plain' | 'bold' | 'italic'; text: string };

/**
 * Split a line into the tiny inline vocabulary: **bold**, _italic_, and plain
 * text (which may still hold newlines). Shared by the page and the PDF so the
 * two can never disagree about what counts as markup.
 */
export function inlineRuns(text: string): InlineRun[] {
  const runs: InlineRun[] = [];
  const pattern = /\*\*([^*]+)\*\*|_([^_]+)_/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) runs.push({ style: 'plain', text: text.slice(last, m.index) });
    runs.push(m[1] !== undefined ? { style: 'bold', text: m[1] } : { style: 'italic', text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ style: 'plain', text: text.slice(last) });

  return runs;
}

/** Plain text of an item, used for search. */
export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      const items =
        b.type === 'kit' ? b.items.map((i) => i.item) : 'items' in b ? (b.items as string[]) : [];
      return (
        ('text' in b ? b.text : '') +
        (items.length ? ' ' + items.join(' ') : '') +
        ('heading' in b && b.heading ? ' ' + b.heading : '') +
        ('label' in b && b.label ? ' ' + b.label : '')
      );
    })
    .join(' ');
}
