import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { inlineRuns } from '../blocks';
import { countParts } from '../kinds';
import type { Block, Item, Kind } from '../types';

export type PdfFormat = 'a4' | 'booklet';

export interface PdfOptions {
  format: PdfFormat;
  title: string;
  /** Printed on the covers and in the page footer; may be empty. */
  group: string;
  /** A front cover and contents page (plus a back cover on a booklet). */
  cover: boolean;
  /** Start every item on a fresh page instead of running short ones on. */
  newPage: boolean;
}

/** One item as it appears in the export: numbered, and knowing its section. */
export interface PdfEntry {
  item: Item;
  number: number;
  kind: Kind;
  categoryLabel: string;
  /** The first entry of a run of one section. */
  opensSection: boolean;
}

export interface PdfAssets {
  /** Directory or URL holding the .woff files from public/fonts. */
  fontBase: string;
  logo: string;
}

// A4 in points. A booklet page is exactly half a landscape sheet, so two sit
// side by side with the fold dead centre.
const A4_SHORT = 595.28;
const A4_LONG = 841.89;

const PAGE_SIZE: Record<PdfFormat, [number, number]> = {
  a4: [A4_SHORT, A4_LONG],
  booklet: [A4_LONG / 2, A4_SHORT],
};

// The daylight palette: the book is printed on white paper, often in black
// and white, so the green accents of the screen version are left out.
const INK = '#0d1b2a';
const TEXT = '#243447';
const MUTED = '#60707a';
const LINE = '#dce4ea';

// Latin first, then latin-ext for anything it lacks (macrons, for one) —
// react-pdf picks per glyph.
const INTER = ['Inter', 'Inter Ext'];
const POPPINS = ['Poppins', 'Poppins Ext'];

const BLURB =
  'Joeys, Cubs, Scouts, Venturers and Rovers — learning, leading and living life to the fullest.';

/**
 * The booklet's A5 page is the base design. A4 keeps the same layout with type
 * a fifth larger, which fits more on a page than simply enlarging A5 would.
 *
 * `compact` shrinks only the body of an item, for one that would otherwise
 * run a few lines onto a second page — turning over mid-song is worse than
 * slightly smaller type.
 */
function makeStyles(format: PdfFormat, compact = false) {
  const k = format === 'a4' ? 1.2 : 1;
  const b = compact ? 0.84 * k : k;
  const pt = (n: number) => n * k;

  const side = format === 'a4' ? 56 : 38;
  const top = format === 'a4' ? 56 : 40;
  const bottom = format === 'a4' ? 84 : 62;
  const geometry = {
    contentHeight: PAGE_SIZE[format][1] - top - bottom,
    // Contents rows are a fixed height so they can be paged up front.
    tocRow: pt(17),
    tocHeader: pt(84),
  };

  const styles = StyleSheet.create({
    page: {
      paddingTop: top,
      paddingBottom: bottom,
      paddingHorizontal: side,
      fontFamily: INTER,
      color: TEXT,
      backgroundColor: '#ffffff',
    },
    coverPage: {
      paddingTop: top,
      paddingBottom: side,
      paddingHorizontal: side,
      fontFamily: INTER,
      color: TEXT,
      backgroundColor: '#ffffff',
    },

    footer: {
      position: 'absolute',
      left: side,
      right: side,
      bottom: format === 'a4' ? 36 : 26,
      borderTopWidth: 0.6,
      borderTopColor: LINE,
      paddingTop: 7,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    footText: {
      fontSize: pt(6.5),
      fontWeight: 600,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: MUTED,
    },

    kicker: {
      fontSize: pt(6.5),
      fontWeight: 600,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: MUTED,
    },
    rule: { width: pt(18), height: pt(2), backgroundColor: INK, marginTop: pt(10) },

    // Items ----------------------------------------------------------------
    // Space after an item. Inside the item, before its end marker, so an item
    // measured as fitting really does fit, gap included.
    itemGap: { height: pt(26) },
    sectionHead: {
      borderBottomWidth: 0.6,
      borderBottomColor: LINE,
      paddingBottom: pt(6),
      marginBottom: pt(16),
    },
    itemHead: { flexDirection: 'row', alignItems: 'center' },
    num: {
      width: pt(15),
      height: pt(15),
      borderRadius: pt(7.5),
      borderWidth: 0.9,
      borderColor: INK,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: pt(6),
    },
    numText: { fontFamily: POPPINS, fontWeight: 700, fontSize: pt(6.5), color: INK },
    title: {
      marginTop: pt(8),
      fontFamily: POPPINS,
      fontWeight: 700,
      fontSize: pt(19),
      lineHeight: 1.15,
      letterSpacing: -0.3,
      color: INK,
    },
    tune: { marginTop: pt(4), fontSize: pt(7.5), fontStyle: 'italic', lineHeight: 1.45, color: MUTED },
    body: { marginTop: b * 14 },
    block: { marginBottom: b * 9 },

    verse: { fontSize: b * 11, lineHeight: compact ? 1.5 : 1.6, color: TEXT },
    verseLabel: { marginBottom: b * 3 },
    bold: { fontWeight: 600, color: INK },
    // Always Inter: Poppins has no italic, so a stage direction inside a
    // punchline would otherwise fail the whole export.
    italic: { fontFamily: INTER, fontStyle: 'italic', color: MUTED },
    note: { fontSize: b * 8.5, fontStyle: 'italic', lineHeight: 1.5, color: MUTED },
    shout: { fontFamily: POPPINS, fontWeight: 700, fontSize: b * 12.5, lineHeight: 1.35, color: INK },

    box: {
      borderWidth: 0.75,
      borderColor: LINE,
      borderRadius: pt(9),
      paddingVertical: b * 10,
      paddingHorizontal: pt(12),
    },
    boxHead: { marginBottom: b * 6 },
    boxItem: { fontSize: b * 8.5, lineHeight: 1.5, color: TEXT, marginTop: b * 1.5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    gridItem: { width: '50%', paddingRight: pt(8) },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: b * 4 },
    pill: {
      borderWidth: 0.75,
      borderColor: LINE,
      borderRadius: pt(9),
      paddingVertical: b * 3,
      paddingHorizontal: pt(8),
    },
    pillText: { fontSize: b * 8.5, color: INK },

    // Contents ---------------------------------------------------------------
    h1: {
      marginTop: pt(8),
      fontFamily: POPPINS,
      fontWeight: 700,
      fontSize: pt(24),
      lineHeight: 1.1,
      letterSpacing: -0.4,
      color: INK,
    },
    toc: { flexDirection: 'row', justifyContent: 'space-between' },
    tocBelowHeader: { marginTop: pt(20) },
    tocColumn: { width: '47%' },
    tocRow: {
      height: geometry.tocRow,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 0.6,
      borderBottomColor: LINE,
    },
    tocSection: { height: geometry.tocRow, justifyContent: 'flex-end', paddingBottom: pt(4) },
    tocNum: { width: pt(16), fontSize: pt(7), fontWeight: 600, color: MUTED },
    tocTitle: { flex: 1, fontSize: pt(8.5), color: TEXT, maxLines: 1, textOverflow: 'ellipsis' },
    tocPage: { width: pt(20), textAlign: 'right', fontSize: pt(8.5), color: TEXT },

    // Covers -----------------------------------------------------------------
    brandRow: { flexDirection: 'row', alignItems: 'center' },
    brandMark: {
      width: pt(22),
      height: pt(22),
      borderRadius: pt(11),
      borderWidth: 0.9,
      borderColor: INK,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: pt(8),
    },
    brandLogo: { width: pt(14), height: pt(12) },
    coverMain: { flexGrow: 1, justifyContent: 'flex-end', paddingBottom: pt(40) },
    coverTitle: {
      marginTop: pt(12),
      fontFamily: POPPINS,
      fontWeight: 800,
      fontSize: pt(40),
      lineHeight: 1.08,
      letterSpacing: -1,
      color: INK,
      maxWidth: '82%',
    },
    coverRule: { marginTop: pt(16) },
    coverLede: { marginTop: pt(14), fontSize: pt(9.5), lineHeight: 1.6, color: TEXT, maxWidth: '78%' },
    coverFoot: { flexDirection: 'row', justifyContent: 'space-between' },
    backName: {
      marginTop: pt(12),
      fontFamily: POPPINS,
      fontWeight: 700,
      fontSize: pt(20),
      lineHeight: 1.15,
      color: INK,
    },
  });

  return { ...styles, geometry };
}

type Styles = ReturnType<typeof makeStyles>;

/** "12 songs, 3 skits and 2 cheers" */
function countPhrase(entries: PdfEntry[], kinds: Kind[]): string {
  const parts = countParts(
    entries.map((e) => e.item),
    kinds,
  );
  if (parts.length < 2) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

type TocRow = { type: 'section'; label: string } | { type: 'entry'; entry: PdfEntry };

/**
 * Split the contents into pages of two columns before layout. Rows are a
 * fixed height, so this is arithmetic, and react-pdf never has to break a
 * column it cannot balance against its neighbour.
 */
function tocPages(entries: PdfEntry[], sectioned: boolean, s: Styles): TocRow[][][] {
  const { contentHeight, tocRow, tocHeader } = s.geometry;
  const rows: TocRow[] = entries.flatMap((entry): TocRow[] =>
    sectioned && entry.opensSection
      ? [{ type: 'section', label: entry.kind.label }, { type: 'entry', entry }]
      : [{ type: 'entry', entry }],
  );

  const pages: TocRow[][][] = [];
  let start = 0;

  while (start < rows.length) {
    const firstPage = pages.length === 0;
    const capacity = Math.max(
      2,
      Math.floor((contentHeight - (firstPage ? tocHeader : 0)) / tocRow),
    );
    // Fill the columns on every page but the last, which is balanced.
    const remaining = rows.length - start;
    const leftSize = remaining <= capacity * 2 ? Math.ceil(remaining / 2) : capacity;

    const columns: TocRow[][] = [];
    for (const size of [leftSize, capacity]) {
      let end = Math.min(start + size, rows.length);
      // Never leave a section name stranded at the foot of a column.
      if (end < rows.length && end - start > 1 && rows[end - 1].type === 'section') end -= 1;
      columns.push(rows.slice(start, end));
      start = end;
    }
    pages.push(columns);
  }

  return pages;
}

function Inline({ text, s }: { text: string; s: Styles }) {
  return (
    <>
      {inlineRuns(text).map((run, i) =>
        run.style === 'plain' ? (
          run.text
        ) : (
          <Text key={i} style={run.style === 'bold' ? s.bold : s.italic}>
            {run.text}
          </Text>
        ),
      )}
    </>
  );
}

function BlockView({ block, s }: { block: Block; s: Styles }) {
  switch (block.type) {
    case 'verse':
      return (
        <View style={s.block}>
          {block.label ? (
            <Text style={[s.kicker, s.verseLabel]} minPresenceAhead={30}>
              {block.label}
            </Text>
          ) : null}
          <Text style={s.verse}>
            <Inline text={block.text} s={s} />
          </Text>
        </View>
      );

    case 'note':
      return (
        <Text style={[s.block, s.note]}>
          <Inline text={block.text} s={s} />
        </Text>
      );

    case 'shout':
      return (
        <Text style={[s.block, s.shout]}>
          <Inline text={block.text} s={s} />
        </Text>
      );

    case 'box':
    case 'grid':
      return (
        <View style={[s.block, s.box]}>
          {block.heading ? <Text style={[s.kicker, s.boxHead]}>{block.heading}</Text> : null}
          <View style={block.type === 'grid' ? s.grid : undefined}>
            {block.items.map((line, j) => (
              <Text key={j} style={block.type === 'grid' ? [s.boxItem, s.gridItem] : s.boxItem}>
                <Inline text={line} s={s} />
              </Text>
            ))}
          </View>
        </View>
      );

    case 'pills':
      return (
        <View style={[s.block, s.pills]}>
          {block.items.map((line, j) => (
            <View key={j} style={s.pill}>
              <Text style={s.pillText}>{line}</Text>
            </View>
          ))}
        </View>
      );

    default:
      return null;
  }
}

/**
 * Zero-height text that reports which page it landed on. react-pdf calls
 * render props again once pagination is final, so the last call wins.
 */
function PageMarker({ onPage }: { onPage: (page: number) => void }) {
  return (
    <Text
      render={({ pageNumber }) => {
        onPage(pageNumber);
        return null;
      }}
    />
  );
}

function Footer({ label, s }: { label: string; s: Styles }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footText}>{label}</Text>
      <Text style={s.footText} render={({ pageNumber }) => String(pageNumber)} />
    </View>
  );
}

function Brand({ name, logo, s }: { name: string; logo: string; s: Styles }) {
  return (
    <View style={s.brandRow}>
      <View style={s.brandMark}>
        <Image src={logo} style={s.brandLogo} />
      </View>
      <Text style={s.kicker}>{name}</Text>
    </View>
  );
}

export interface BookDocumentProps {
  entries: PdfEntry[];
  kinds: Kind[];
  options: PdfOptions;
  assets: PdfAssets;
  /**
   * Measuring pass: no covers, and every item starts a page, so the markers
   * say whether each one fits on a single page.
   */
  measure?: boolean;
  /** Items that fit on one page, so can be kept whole. */
  fits?: Set<string>;
  /** Items set in smaller type to make them fit. */
  compact?: Set<string>;
  /**
   * Whether to print section headings: the export spans sections and keeps
   * each together. Passed in rather than worked out here, so a measuring pass
   * over a subset lays items out identically.
   */
  sectioned: boolean;
  onItemPage: (id: string, edge: 'start' | 'end', page: number) => void;
  /** Contents page lookup; resolved after the items have been paginated. */
  pageOf?: (id: string) => number | undefined;
}

export function BookDocument({
  entries,
  kinds,
  options,
  assets,
  measure = false,
  fits,
  compact,
  sectioned,
  onItemPage,
  pageOf,
}: BookDocumentProps) {
  const s = makeStyles(options.format);
  const sc = makeStyles(options.format, true);
  const size = PAGE_SIZE[options.format];
  const covers = options.cover && !measure;
  const brandName = options.group || 'ScoutBase';
  const footLabel = options.group || options.title;
  const counts = countPhrase(entries, kinds);

  return (
    <Document title={options.title} author={options.group || undefined} creator="Campfire Book">
      {covers ? (
        <Page size={size} style={s.coverPage}>
          <Brand name={brandName} logo={assets.logo} s={s} />
          <View style={s.coverMain}>
            <Text style={s.kicker}>Sing loud · laugh often</Text>
            <Text style={s.coverTitle}>{options.title}</Text>
            <View style={[s.rule, s.coverRule]} />
            <Text style={s.coverLede}>
              {counts.charAt(0).toUpperCase() + counts.slice(1)} for the fire.
            </Text>
          </View>
          <View style={s.coverFoot}>
            <Text style={s.footText}>{brandName}</Text>
            <Text style={s.footText}>{new Date().getFullYear()}</Text>
          </View>
        </Page>
      ) : null}

      {covers
        ? tocPages(entries, sectioned, s).map((columns, p) => (
            <Page key={`toc-${p}`} size={size} style={s.page}>
              {p === 0 ? (
                <>
                  <Text style={s.kicker}>{counts}</Text>
                  <Text style={s.h1}>Contents</Text>
                  <View style={s.rule} />
                </>
              ) : null}
              <View style={p === 0 ? [s.toc, s.tocBelowHeader] : s.toc}>
                {[0, 1].map((c) => (
                  <View key={c} style={s.tocColumn}>
                    {(columns[c] ?? []).map((row, r) => {
                      if (row.type === 'section') {
                        return (
                          <View key={r} style={s.tocSection}>
                            <Text style={s.kicker}>{row.label}</Text>
                          </View>
                        );
                      }
                      const { entry } = row;
                      return (
                        <View key={r} style={s.tocRow}>
                          <Text style={s.tocNum}>{entry.number}</Text>
                          <Text style={s.tocTitle}>{entry.item.title}</Text>
                          <Text
                            style={s.tocPage}
                            render={() => String(pageOf?.(entry.item.id) ?? '')}
                          />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
              <Footer label={footLabel} s={s} />
            </Page>
          ))
        : null}

      <Page size={size} style={s.page}>
        {entries.map((e, i) => {
          const id = e.item.id;
          const whole = fits?.has(id) ?? false;
          const is = compact?.has(id) ? sc : s;
          const sectionBreak = sectioned && e.opensSection;
          // A break on the very first item would leave a blank page.
          const breakBefore = i > 0 && (measure || options.newPage || sectionBreak || !whole);

          return (
            <View key={id} wrap={!whole} break={breakBefore}>
              <PageMarker onPage={(p) => onItemPage(id, 'start', p)} />
              {sectionBreak ? (
                <View style={s.sectionHead}>
                  <Text style={s.kicker}>{e.kind.label}</Text>
                </View>
              ) : null}
              <View style={s.itemHead}>
                <View style={s.num}>
                  <Text style={s.numText}>{e.number}</Text>
                </View>
                <Text style={s.kicker}>{e.categoryLabel}</Text>
              </View>
              <Text style={s.title}>{e.item.title}</Text>
              {e.item.tune ? <Text style={s.tune}>{e.item.tune}</Text> : null}
              <View style={s.rule} />
              <View style={is.body}>
                {e.item.blocks.map((block, j) => (
                  <BlockView key={j} block={block} s={is} />
                ))}
              </View>
              <View style={s.itemGap} />
              <PageMarker onPage={(p) => onItemPage(id, 'end', p)} />
            </View>
          );
        })}
        <Footer label={footLabel} s={s} />
      </Page>

      {covers && options.format === 'booklet' ? (
        <Page size={size} style={s.coverPage}>
          <View style={s.coverMain}>
            <Brand name="Campfire Book" logo={assets.logo} s={s} />
            <Text style={s.backName}>{brandName}</Text>
            <View style={[s.rule, s.coverRule]} />
            <Text style={s.coverLede}>{BLURB}</Text>
          </View>
          <View style={s.coverFoot}>
            <Text style={s.footText}>{options.title}</Text>
            <Text style={s.footText}>{counts}</Text>
          </View>
        </Page>
      ) : null}
    </Document>
  );
}
