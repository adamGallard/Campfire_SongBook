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
import { A_FRAME } from './drawings/builds';
import { BOWLINE, CLOVE_HITCH, REEF_KNOT, ROUND_TURN_TWO_HALF_HITCHES, SHEET_BEND, TIMBER_HITCH } from './drawings/knots';
import { LASHINGS } from './drawings/lashings';

export type Shape =
  /** A spar seen side-on, with its grain, turned `angle` degrees about its centre. */
  | { t: 'spar'; x: number; y: number; w: number; h: number; grain?: string; angle?: number }
  /** A spar drawn as a thick line, for frames. */
  | { t: 'pole'; x1: number; y1: number; x2: number; y2: number }
  /**
   * Rope: a thick outlined path. `back` is the part behind the spar, dashed
   * and faint. `tone: 'b'` is a second rope, or the other end of the same
   * one, in a second colour so each can be followed.
   */
  | { t: 'rope'; d: string; back?: boolean; tone?: 'b' }
  /** One turn of a lashing, seen across a spar. */
  | { t: 'wrap'; x1: number; y1: number; x2: number; y2: number }
  /** Which way to pull or go next. */
  | { t: 'arrow'; x: number; y: number; angle: number }
  | { t: 'label'; x: number; y: number; text: string; anchor?: 'start' | 'middle' | 'end'; rotate?: number }
  /** A measuring line, with its text as a label. */
  | { t: 'dim'; d: string }
  | { t: 'ground'; x1: number; y1: number; x2: number; y2: number }
  /** A lettered marker, with a leader line to what it points at. */
  | { t: 'callout'; x: number; y: number; to: [number, number]; letter: string }
  /** Shapes moved, scaled or turned together: an SVG transform list. */
  | { t: 'group'; transform: string; shapes: Shape[] };

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

const DIAGRAMS: Record<string, ItemDiagrams> = {
  'clove-hitch': CLOVE_HITCH,
  'round-turn-and-two-half-hitches': ROUND_TURN_TWO_HALF_HITCHES,
  'timber-hitch': TIMBER_HITCH,
  'reef-knot': REEF_KNOT,
  'sheet-bend': SHEET_BEND,
  bowline: BOWLINE,
  ...LASHINGS,
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
