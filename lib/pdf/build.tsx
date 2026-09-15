import { Font, pdf, type DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { BookDocument, type PdfAssets, type PdfEntry, type PdfOptions } from './book-document';
import { imposeBooklet } from './impose';
import { sectionsTogether } from '../kinds';
import type { Item, Kind, Tag } from '../types';

export type { PdfAssets, PdfFormat, PdfOptions } from './book-document';

let fontsFrom: string | null = null;

function registerFonts(base: string) {
  if (fontsFrom === base) return;
  fontsFrom = base;

  const inter = (subset: string) => [
    { src: `${base}/inter-${subset}-400-normal.woff`, fontWeight: 400 },
    { src: `${base}/inter-${subset}-400-italic.woff`, fontWeight: 400, fontStyle: 'italic' as const },
    { src: `${base}/inter-${subset}-600-normal.woff`, fontWeight: 600 },
    { src: `${base}/inter-${subset}-600-italic.woff`, fontWeight: 600, fontStyle: 'italic' as const },
  ];
  const poppins = (subset: string) => [
    { src: `${base}/poppins-${subset}-700-normal.woff`, fontWeight: 700 },
    { src: `${base}/poppins-${subset}-800-normal.woff`, fontWeight: 800 },
  ];

  Font.register({ family: 'Inter', fonts: inter('latin') });
  Font.register({ family: 'Inter Ext', fonts: inter('latin-ext') });
  Font.register({ family: 'Poppins', fonts: poppins('latin') });
  Font.register({ family: 'Poppins Ext', fonts: poppins('latin-ext') });

  // A lyric broken mid-word is hard to sing from; wrap whole words only.
  Font.registerHyphenationCallback((word) => [word]);
}

/**
 * Number the items in the order given. Section headings only make sense when
 * each section is kept together; a running order that mixes them instead names
 * the section on every item, so a skit is not mistaken for a song.
 */
export function planEntries(
  items: Item[],
  kinds: Kind[],
  tags: Tag[],
): { entries: PdfEntry[]; sectioned: boolean } {
  // A section that has since been switched off is not part of the book.
  const known = items.flatMap((item) => {
    const kind = kinds.find((k) => k.slug === item.kind);
    return kind ? [{ item, kind }] : [];
  });

  const grouped = sectionsTogether(known.map((e) => e.item));
  const sectionCount = new Set(known.map((e) => e.kind.slug)).size;

  const entries = known.map(({ item, kind }, i): PdfEntry => {
    const tag = tags.find((t) => t.kind === item.kind && t.slug === item.tag);
    const label = item.category_label ?? tag?.label ?? item.tag;
    return {
      item,
      kind,
      number: i + 1,
      categoryLabel: grouped ? label : `${kind.singular} · ${label}`,
      opensSection: i === 0 || known[i - 1].kind !== kind,
    };
  });

  return { entries, sectioned: grouped && sectionCount > 1 };
}

async function render(doc: ReactElement): Promise<Uint8Array> {
  // BookDocument renders a <Document>; pdf() just cannot see through it.
  const blob = await pdf(doc as ReactElement<DocumentProps>).toBlob();
  return new Uint8Array(await blob.arrayBuffer());
}

export interface BuildInput {
  /** Only the items to export, in the order they print. */
  items: Item[];
  kinds: Kind[];
  tags: Tag[];
  options: PdfOptions;
  assets: PdfAssets;
}

/**
 * Lay the selection out as a PDF, imposed for folding if it is a booklet.
 *
 * Page breaks cannot be known before layout, so this lays out more than once:
 * with every item on its own page, to learn which fit on one page and can be
 * kept whole; again in smaller type for those that did not; then for real,
 * which also tells the contents page where each item landed.
 */
export async function buildBookPdf({ items, kinds, tags, options, assets }: BuildInput) {
  registerFonts(assets.fontBase);

  const { entries, sectioned } = planEntries(items, kinds, tags);
  if (entries.length === 0) throw new Error('Nothing is selected.');

  const pages = new Map<string, { start?: number; end?: number }>();
  const onItemPage = (id: string, edge: 'start' | 'end', page: number) => {
    pages.set(id, { ...pages.get(id), [edge]: page });
  };
  const common = { kinds, options, assets, sectioned, onItemPage };

  /** Lay the entries out one per page and return the ids that fit on one. */
  const measure = async (subset: PdfEntry[], compact?: Set<string>) => {
    pages.clear();
    await render(<BookDocument {...common} entries={subset} compact={compact} measure />);
    const fit = new Set<string>();
    for (const [id, { start, end }] of pages) {
      if (start !== undefined && start === end) fit.add(id);
    }
    pages.clear();
    return fit;
  };

  const fits = await measure(entries);
  const overflowing = entries.filter((e) => !fits.has(e.item.id));
  const compact = overflowing.length
    ? await measure(overflowing, new Set(overflowing.map((e) => e.item.id)))
    : new Set<string>();
  compact.forEach((id) => fits.add(id));

  const shown = new Map<string, number | undefined>();
  const pageOf = (id: string) => {
    const page = pages.get(id)?.start;
    shown.set(id, page);
    return page;
  };
  const finalDoc = (
    <BookDocument {...common} entries={entries} fits={fits} compact={compact} pageOf={pageOf} />
  );

  let bytes = await render(finalDoc);

  // react-pdf resolves the contents page after paginating the items, so the
  // numbers should already be right. If that ever changes, the positions from
  // this layout are now known, and one more pass prints them.
  if (options.cover && entries.some((e) => shown.get(e.item.id) !== pages.get(e.item.id)?.start)) {
    bytes = await render(finalDoc);
  }

  return options.format === 'booklet'
    ? imposeBooklet(bytes, { keepLastPageLast: options.cover })
    : bytes;
}
