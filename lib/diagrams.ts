/**
 * Step diagrams and build drawings, kept as data so the page and the PDF draw
 * the same geometry: the page in the book's colours (components/Diagram.tsx),
 * the PDF in ink for printing (lib/pdf/book-document.tsx).
 *
 * Drawings are keyed by an item's slug. Each step drawing records the exact
 * step it shows, and a steps block only gets drawings when every one of its
 * steps still reads as recorded, in the same order. Rewording, reordering,
 * adding or removing a step in admin therefore can never put a drawing beside
 * the wrong instruction; the drawings stand aside until they are redrawn and
 * their `step` text updated to match.
 *
 * Shapes are drawn in order, so list what sits behind first.
 */
export type Shape =
  /** A spar seen side-on, with its grain. */
  | { t: 'spar'; x: number; y: number; w: number; h: number; grain?: string }
  /** A spar drawn as a thick line, for frames. */
  | { t: 'pole'; x1: number; y1: number; x2: number; y2: number }
  /** Rope: a thick outlined path. `back` is the part behind the spar, dashed and faint. */
  | { t: 'rope'; d: string; back?: boolean }
  /** One turn of a lashing, seen across a spar. */
  | { t: 'wrap'; x1: number; y1: number; x2: number; y2: number }
  /** Which way to pull or go next. */
  | { t: 'arrow'; x: number; y: number; angle: number }
  | { t: 'label'; x: number; y: number; text: string; anchor?: 'start' | 'middle' | 'end'; rotate?: number }
  /** A measuring line, with its text as a label. */
  | { t: 'dim'; d: string }
  | { t: 'ground'; x1: number; y1: number; x2: number; y2: number }
  /** A lettered marker, with a leader line to what it points at. */
  | { t: 'callout'; x: number; y: number; to: [number, number]; letter: string };

export interface Drawing {
  width: number;
  height: number;
  /** Read out in place of the picture. */
  title: string;
  shapes: Shape[];
}

export interface Overview extends Drawing {
  /** What each callout letter marks. */
  legend?: { letter: string; name: string; where: string }[];
}

/** A drawing of one step, and the words of the step it shows. */
export interface StepDrawing extends Drawing {
  step: string;
}

export interface ItemDiagrams {
  /** One per step, in order, each naming the step it shows. */
  steps?: StepDrawing[];
  /** A single drawing of the finished thing, shown above the text. */
  overview?: Overview;
}

// Clove hitch ---------------------------------------------------------------
// A vertical spar seen from the front. The rope comes in from the left; parts
// that pass behind the spar are dashed.
const CLOVE_SPAR: Shape = { t: 'spar', x: 85, y: 8, w: 30, h: 204, grain: 'M94 22 V96 M94 176 V200 M105 30 V70 M106 186 V204' };
const CLOVE = {
  firstFront: 'M8 150 H108 C117 150 120 153 118 157',
  firstBack: 'M118 157 L84 163',
  firstEnd: 'M84 163 C77 164 72 170 70 180',
  diagonal: 'M84 163 C78 163 80 157 88 154 L112 124 C117 118 120 117 118 115',
  secondBack: 'M118 115 L84 121',
  secondEnd: 'M84 121 C77 121 72 126 70 134',
  tucked: 'M84 121 C79 121 82 126 90 126 H190',
};

const cloveStep = (step: string, title: string, shapes: Shape[]): StepDrawing => ({
  step,
  width: 200,
  height: 220,
  title,
  shapes: [CLOVE_SPAR, ...shapes],
});

const CLOVE_HITCH: ItemDiagrams = {
  steps: [
    cloveStep('Take the end round the spar.', 'The rope crosses the front of the spar and goes round the back.', [
      { t: 'rope', d: CLOVE.firstFront },
      { t: 'rope', d: CLOVE.firstBack, back: true },
      { t: 'rope', d: CLOVE.firstEnd },
      { t: 'arrow', x: 70, y: 181, angle: 101 },
      { t: 'label', x: 6, y: 205, text: 'Working end' },
    ]),
    cloveStep(
      'Cross it over the standing part and take it round the spar again, beside the first turn.',
      'The end crosses the front again, over the first turn, and goes round the back above it.',
      [
        { t: 'rope', d: CLOVE.firstFront },
        { t: 'rope', d: CLOVE.firstBack, back: true },
        { t: 'rope', d: CLOVE.diagonal },
        { t: 'rope', d: CLOVE.secondBack, back: true },
        { t: 'rope', d: CLOVE.secondEnd },
        { t: 'arrow', x: 70, y: 135, angle: 104 },
      ],
    ),
    cloveStep(
      'Tuck the end under the turn you have just made, so it comes out between the two turns, beside the standing part.',
      'The end is tucked under the diagonal and comes out beside the standing part.',
      [
        { t: 'rope', d: CLOVE.firstBack, back: true },
        { t: 'rope', d: CLOVE.secondBack, back: true },
        { t: 'rope', d: CLOVE.firstFront },
        { t: 'rope', d: CLOVE.tucked },
        { t: 'rope', d: CLOVE.diagonal },
        { t: 'arrow', x: 192, y: 126, angle: 0 },
      ],
    ),
    cloveStep(
      'Pull both ends tight and push the turns snug against each other.',
      'The finished clove hitch, with both ends pulled tight in opposite directions.',
      [
        { t: 'rope', d: CLOVE.firstBack, back: true },
        { t: 'rope', d: CLOVE.secondBack, back: true },
        { t: 'rope', d: CLOVE.firstFront },
        { t: 'rope', d: CLOVE.tucked },
        { t: 'rope', d: CLOVE.diagonal },
        { t: 'arrow', x: 6, y: 150, angle: 180 },
        { t: 'arrow', x: 194, y: 126, angle: 0 },
        { t: 'label', x: 4, y: 175, text: 'Standing part' },
        { t: 'label', x: 197, y: 111, text: 'Working end', anchor: 'end' },
      ],
    ),
  ],
};

// A-frame -------------------------------------------------------------------
function squareWraps(x: number): Shape[] {
  return [-6, 0, 6].flatMap((k): Shape[] => [
    { t: 'wrap', x1: x - 11 + k, y1: 244, x2: x + 11 + k, y2: 266 },
    { t: 'wrap', x1: x + 11 + k, y1: 244, x2: x - 11 + k, y2: 266 },
  ]);
}

const A_FRAME: ItemDiagrams = {
  overview: {
    width: 300,
    height: 330,
    title:
      'An A-frame: two 2.4 m legs joined near the top by a shear lashing, and a 1.8 m ledger square-lashed across them 30 cm above the ground.',
    shapes: [
      { t: 'ground', x1: 20, y1: 312, x2: 280, y2: 312 },
      { t: 'pole', x1: 70, y1: 305, x2: 165, y2: 25 },
      { t: 'pole', x1: 230, y1: 305, x2: 135, y2: 25 },
      { t: 'pole', x1: 52, y1: 255, x2: 248, y2: 255 },
      ...[58, 63.5, 69, 74.5, 80].map((y): Shape => ({ t: 'wrap', x1: 137, y1: y, x2: 163, y2: y })),
      ...squareWraps(87),
      ...squareWraps(213),
      { t: 'dim', d: 'M250 298 L166 36' },
      { t: 'label', x: 214, y: 150, text: 'leg 2.4 m', anchor: 'middle', rotate: -72 },
      { t: 'dim', d: 'M52 274 H248 M52 270 V278 M248 270 V278' },
      { t: 'label', x: 150, y: 290, text: 'ledger 1.8 m', anchor: 'middle' },
      { t: 'dim', d: 'M30 255 V310 M26 255 H34 M26 310 H34' },
      { t: 'label', x: 36, y: 237, text: '30 cm' },
      { t: 'callout', x: 205, y: 60, to: [165, 68], letter: 'A' },
      { t: 'callout', x: 60, y: 210, to: [84, 245], letter: 'B' },
      { t: 'callout', x: 240, y: 210, to: [216, 245], letter: 'B' },
    ],
    legend: [
      { letter: 'A', name: 'Shear lashing', where: 'where the legs cross' },
      { letter: 'B', name: 'Square lashing', where: 'ledger to each leg' },
    ],
  },
};

const DIAGRAMS: Record<string, ItemDiagrams> = {
  'clove-hitch': CLOVE_HITCH,
  'a-frame': A_FRAME,
};

export function diagramsFor(slug: string): ItemDiagrams | undefined {
  return DIAGRAMS[slug];
}

/** Compared loosely: case, spacing, and bold and italic marks do not matter. */
function sameStep(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\*\*|_/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  return norm(a) === norm(b);
}

/**
 * The drawings for a steps block, or none unless every step still reads as
 * the drawings record, in the same order.
 */
export function stepDrawings(diagrams: ItemDiagrams | undefined, steps: string[]): StepDrawing[] | null {
  const drawings = diagrams?.steps;
  if (!drawings || drawings.length !== steps.length) return null;
  return drawings.every((d, i) => sameStep(d.step, steps[i])) ? drawings : null;
}
