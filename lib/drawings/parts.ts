import type { Shape } from '../diagrams';
import { CLOVE } from './knots';

/**
 * The finished clove hitch from the clove hitch drawings, with short ends, as
 * one piece that can be fitted onto any spar: it starts and finishes most
 * lashings. Drawn round a spar 30 wide centred on (100, 139).
 */
const CLOVE_PIECE: Shape[] = [
  { t: 'rope', d: CLOVE.firstBack, back: true },
  { t: 'rope', d: CLOVE.secondBack, back: true },
  { t: 'rope', d: 'M62 150 H108 C117 150 120 153 118 157' },
  { t: 'rope', d: 'M84 121 C79 121 82 126 90 126 H138' },
  { t: 'rope', d: CLOVE.diagonal },
];

/**
 * A clove hitch on a spar `width` wide, centred at (cx, cy) and turned
 * `angle` degrees: 0 for an upright, 90 or -90 for a crosspiece. Before
 * turning, its short ends leave to the left at (-38, +11) and to the right
 * at (+38, -13) from the centre, scaled to the spar.
 */
export function cloveGlyph(cx: number, cy: number, width: number, angle = 0, along?: number): Shape {
  const k = width / 30;
  // `along` squeezes or stretches it along the spar, for a hitch round two.
  const ky = along ?? k;
  return {
    t: 'group',
    transform: `translate(${cx} ${cy}) rotate(${angle}) scale(${k.toFixed(4)} ${ky.toFixed(4)}) translate(-100 -139)`,
    shapes: CLOVE_PIECE,
  };
}
