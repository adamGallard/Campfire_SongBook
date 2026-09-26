import type { ItemDiagrams, Shape, StepDrawing } from '../diagrams';
import { cloveGlyph } from './parts';

/**
 * Lashing drawings, seen from the front. As in the knots, rope that passes
 * behind a spar is dashed. Each step records the words of the step it shows
 * (see lib/diagrams.ts); change the seed text and these together.
 */

const step = (words: string, title: string, shapes: Shape[]): StepDrawing => ({
  step: words,
  width: 200,
  height: 220,
  title,
  shapes,
});
const rope = (d: string): Shape => ({ t: 'rope', d });
const back = (d: string): Shape => ({ t: 'rope', d, back: true });
const arrow = (x: number, y: number, angle: number): Shape => ({ t: 'arrow', x, y, angle });
const label = (x: number, y: number, text: string, anchor?: 'start' | 'middle' | 'end'): Shape => ({
  t: 'label',
  x,
  y,
  text,
  anchor,
});

// Square lashing --------------------------------------------------------------
// Close in on the joint: an upright (x 82–118) with a crosspiece (y 90–126)
// across its front.
const UPRIGHT: Shape = { t: 'spar', x: 82, y: 2, w: 36, h: 216, grain: 'M93 12 V78 M93 140 V206 M107 18 V60 M107 150 V190' };
const CROSSPIECE: Shape = { t: 'spar', x: 2, y: 90, w: 196, h: 36, grain: 'M12 101 H44 M156 101 H190 M16 115 H40 M160 115 H186' };

/**
 * One wrap: up the front of the crosspiece on the left, behind the upright
 * above it, down the front on the right, behind the upright below it. Each
 * wrap sits outside the last on the crosspiece and inside it on the upright.
 */
function squareWrap(i: number): Shape[] {
  const L = 72 - 6 * i;
  const R = 128 + 6 * i;
  const T = 80 + 3 * i;
  const B = 136 - 3 * i;
  const nextL = 72 - 6 * (i + 1);
  return [
    back(`M82 ${T} L118 ${T}`),
    back(`M118 ${B + 5} L82 ${B + 5}`),
    rope(`M${L} ${B} L${L} ${T + 5} C${L} ${T} ${L + 4} ${T} 82 ${T}`),
    rope(`M118 ${T} C${R - 4} ${T} ${R} ${T} ${R} ${T + 5} L${R} ${B} C${R} ${B + 5} ${R - 4} ${B + 5} 118 ${B + 5}`),
    // Round to where the next wrap starts.
    rope(`M82 ${B + 5} C${L - 2} ${B + 5} ${nextL} ${B + 4} ${nextL} ${B - 3}`),
  ];
}
const WRAPS = [...squareWrap(0), ...squareWrap(1), ...squareWrap(2)];

// The clove hitch that starts it, on the upright below the crosspiece, and
// the rope from it up to the first wrap.
const SQUARE_START: Shape[] = [
  cloveGlyph(100, 178, 36),
  rope('M56 191 C40 188 40 160 52 150 C60 144 72 146 72 136'),
];

// Frapping: round the wraps on each side, passing between the spars (dashed
// where the upright hides it).
const FRAPPING: Shape[] = [
  back('M82 100 L118 100'),
  back('M82 116 L118 116'),
  rope('M54 133 C44 126 44 100 54 100 L82 100'),
  rope('M118 100 L146 100 C156 100 156 116 146 116 L118 116'),
  rope('M82 116 L56 116'),
];

const SQUARE_LASHING: ItemDiagrams = {
  steps: [
    step(
      'Tie a clove hitch on the upright, just below where the crosspiece will sit. Twist the short end round the rope so it is out of the way.',
      'A clove hitch on the upright, just below the crosspiece, with the rope leading up.',
      [UPRIGHT, CROSSPIECE, ...SQUARE_START, arrow(72, 133, -90), label(196, 214, 'Clove hitch', 'end')],
    ),
    step(
      'Take the rope up over the crosspiece, behind the upright, down in front of the crosspiece and behind the upright again. That is one wrap.',
      'One wrap: up over the crosspiece, behind the upright, down over the crosspiece and behind the upright again.',
      [UPRIGHT, CROSSPIECE, ...SQUARE_START, ...squareWrap(0), arrow(66, 130, -90)],
    ),
    step(
      'Make three or four wraps, pulling each one tight. On the crosspiece each wrap goes outside the last; on the upright, inside.',
      'Three wraps side by side: further out along the crosspiece each time, closer in on the upright.',
      [UPRIGHT, CROSSPIECE, ...SQUARE_START, ...WRAPS, arrow(54, 130, -90)],
    ),
    step(
      'Make two or three frapping turns: wind the rope between the two spars, round the wraps, and pull hard. This is what tightens the lashing.',
      'Frapping turns wound round the wraps between the two spars, pulling them tight.',
      [UPRIGHT, CROSSPIECE, ...SQUARE_START, ...WRAPS, ...FRAPPING, arrow(58, 116, 180), label(100, 60, 'Frapping turns', 'middle')],
    ),
    step(
      'Finish with a clove hitch on the crosspiece.',
      'The finished square lashing, with a clove hitch on the crosspiece beside it.',
      [
        // Stepped back a little so the finishing hitch fits beside the wraps.
        {
          t: 'group',
          transform: 'translate(100 110) scale(0.7) translate(-100 -110)',
          shapes: [
            UPRIGHT,
            { ...CROSSPIECE, x: -40, w: 280 } as Shape,
            ...SQUARE_START,
            ...WRAPS,
            ...FRAPPING,
            rope('M56 116 C44 118 42 150 76 158 L200 158 C208 158 213 158 213 154'),
            cloveGlyph(200, 108, 36, -90),
          ],
        },
        label(168, 42, 'Clove hitch', 'middle'),
      ],
    ),
  ],
};

// Diagonal lashing ------------------------------------------------------------
// Two spars crossing as an X, one behind the other. The first wraps run up and
// down the crossing, the second across it.
const X_BACK: Shape = { t: 'spar', x: 83, y: -2, w: 34, h: 224, angle: -45, grain: 'M94 20 V80 M94 140 V200 M106 30 V70' };
const X_FRONT: Shape = { t: 'spar', x: 83, y: -2, w: 34, h: 224, angle: 45, grain: 'M94 20 V80 M94 140 V200 M106 150 V190' };

const TIMBER_HITCH: Shape[] = [
  back('M106 80 L106 142'),
  rope('M100 78 L100 142 C100 150 106 150 106 142'),
  rope('M100 78 C100 70 108 68 110 74 C112 80 104 82 106 88 C108 94 116 92 114 86'),
  rope('M106 80 C104 70 92 62 70 60 L28 58'),
];
const firstWraps = (n: number): Shape[] =>
  [92, 100, 108].slice(0, n).flatMap((x) => [back(`M${x + 4} 80 L${x + 4} 142`), rope(`M${x} 80 L${x} 142`)]);
const secondWraps: Shape[] = [102, 110, 118].flatMap((y) => [
  back(`M70 ${y - 4} L130 ${y - 4}`),
  rope(`M70 ${y} L130 ${y}`),
]);
const DIAGONAL_FRAPPING: Shape[] = [
  rope('M100 64 C132 64 146 92 146 110 C146 132 124 156 100 156 C74 156 54 132 54 110 C54 88 70 68 96 66'),
  rope('M100 70 C126 70 140 94 140 110 C140 128 122 150 100 150 C78 150 60 128 60 110 C60 92 74 74 96 72'),
];

const DIAGONAL_LASHING: ItemDiagrams = {
  steps: [
    step(
      'Tie a timber hitch round both spars, diagonally across the crossing, and pull it tight to draw the spars together.',
      'A timber hitch round both spars, up and down the crossing, pulled tight.',
      [X_BACK, X_FRONT, ...TIMBER_HITCH, arrow(26, 58, 180), label(100, 214, 'Timber hitch', 'middle')],
    ),
    step(
      'Make three or four wraps along the same diagonal as the timber hitch.',
      'Three wraps running the same way as the timber hitch.',
      [X_BACK, X_FRONT, ...TIMBER_HITCH, ...firstWraps(3)],
    ),
    step(
      'Make three or four wraps across the other diagonal.',
      'Three more wraps running across the first ones.',
      [X_BACK, X_FRONT, ...TIMBER_HITCH, ...firstWraps(3), ...secondWraps],
    ),
    step(
      'Make two frapping turns between the spars, round the wraps, and pull hard.',
      'Two frapping turns round all the wraps, between the spars.',
      [X_BACK, X_FRONT, ...TIMBER_HITCH, ...firstWraps(3), ...secondWraps, ...DIAGONAL_FRAPPING, label(100, 214, 'Frapping turns', 'middle')],
    ),
    step(
      'Finish with a clove hitch on one spar.',
      'The finished diagonal lashing, with a clove hitch on one spar.',
      [
        X_BACK,
        X_FRONT,
        ...TIMBER_HITCH,
        ...firstWraps(3),
        ...secondWraps,
        ...DIAGONAL_FRAPPING,
        rope('M56 128 C50 150 44 160 48 168'),
        cloveGlyph(46, 170, 34, 45),
        label(100, 214, 'Clove hitch', 'middle'),
      ],
    ),
  ],
};

// Shear lashing ---------------------------------------------------------------
// Two spars side by side (x 62–98 and 102–138).
const SHEAR_LEFT: Shape = { t: 'spar', x: 62, y: 2, w: 36, h: 216, grain: 'M72 14 V60 M72 160 V206 M86 20 V50' };
const SHEAR_RIGHT: Shape = { t: 'spar', x: 102, y: 2, w: 36, h: 216, grain: 'M114 14 V60 M114 160 V206 M128 150 V190' };
const SHEAR_Y = [78, 86, 94, 102, 110, 118, 126, 134, 142];
const shearWraps: Shape[] = SHEAR_Y.flatMap((y) => [rope(`M58 ${y + 3} C58 ${y - 1} 62 ${y - 1} 66 ${y - 1} L134 ${y + 1} C138 ${y + 1} 142 ${y + 1} 142 ${y + 5}`)]);
const SHEAR_START: Shape[] = [cloveGlyph(80, 176, 36), rope('M36 188 C24 184 28 158 48 150 C54 148 58 150 58 146')];
const SHEAR_FRAPPING: Shape[] = [
  back('M104 74 L104 146'),
  rope('M96 72 C96 66 104 66 104 72'),
  rope('M96 70 L96 148 C96 154 104 154 104 148'),
  rope('M100 70 L100 150'),
];

const SHEAR_LASHING: ItemDiagrams = {
  steps: [
    step(
      'Lay the two spars side by side. Tie a clove hitch round one of them.',
      'Two spars side by side, with a clove hitch round one of them.',
      [SHEAR_LEFT, SHEAR_RIGHT, ...SHEAR_START, arrow(58, 143, -90), label(196, 214, 'Clove hitch', 'end')],
    ),
    step(
      'Make eight to ten wraps round both spars. Keep them fairly loose, or the spars will not open.',
      'Nine loose wraps round both spars.',
      [SHEAR_LEFT, SHEAR_RIGHT, ...SHEAR_START, ...shearWraps],
    ),
    step(
      'Make two frapping turns between the spars, round the wraps.',
      'Two frapping turns between the spars, round the wraps.',
      [SHEAR_LEFT, SHEAR_RIGHT, ...SHEAR_START, ...shearWraps, ...SHEAR_FRAPPING, label(100, 60, 'Frapping turns', 'middle')],
    ),
    step(
      'Finish with a clove hitch on the other spar.',
      'A clove hitch on the other spar finishes it.',
      [
        SHEAR_LEFT,
        SHEAR_RIGHT,
        ...SHEAR_START,
        ...shearWraps,
        ...SHEAR_FRAPPING,
        rope('M104 72 C110 60 126 58 130 50'),
        cloveGlyph(120, 42, 36),
        label(6, 40, 'Clove hitch'),
      ],
    ),
    step(
      'Open the spars out. The lashing tightens as they open.',
      'The spars opened out into an A, the lashing pulled tight where they cross.',
      [
        { t: 'pole', x1: 58, y1: 212, x2: 124, y2: 14 },
        { t: 'pole', x1: 142, y1: 212, x2: 76, y2: 14 },
        ...[48, 54, 60, 66, 72].map((y): Shape => ({ t: 'wrap', x1: 88, y1: y, x2: 112, y2: y })),
        arrow(40, 206, 180),
        arrow(160, 206, 0),
        { t: 'ground', x1: 20, y1: 216, x2: 180, y2: 216 },
      ],
    ),
  ],
};

// Round lashing ---------------------------------------------------------------
// Two spars overlapping side by side, close in on one lashing; the last step
// stands back to show both.
const ROUND_A: Shape = { t: 'spar', x: 64, y: -10, w: 36, h: 240, grain: 'M74 10 V70 M88 150 V210' };
const ROUND_B: Shape = { t: 'spar', x: 100, y: -10, w: 36, h: 240, grain: 'M112 20 V80 M126 160 V200' };
const ROUND_START: Shape[] = [cloveGlyph(100, 56, 72, 0, 0.9), rope('M62 32 C40 24 30 60 44 74')];
const ROUND_Y = [84, 92, 100, 108, 116, 124, 132, 140];
const roundWraps: Shape[] = ROUND_Y.map((y) => rope(`M58 ${y + 3} C58 ${y - 1} 62 ${y - 1} 66 ${y - 1} L134 ${y + 1} C138 ${y + 1} 142 ${y + 1} 142 ${y + 5}`));
const ROUND_FINISH: Shape[] = [cloveGlyph(100, 172, 72, 0, 0.9)];

const ROUND_LASHING: ItemDiagrams = {
  steps: [
    step(
      'Overlap the two spars by at least a metre. Tie a clove hitch round both of them.',
      'Two overlapping spars with a clove hitch round both.',
      [ROUND_A, ROUND_B, ...ROUND_START, label(196, 214, 'Clove hitch', 'end')],
    ),
    step(
      'Make eight to ten tight wraps round both spars.',
      'Eight tight wraps round both spars.',
      [ROUND_A, ROUND_B, ...ROUND_START, ...roundWraps],
    ),
    step(
      'Finish with a clove hitch round both spars. There is no gap between the spars for frapping turns.',
      'A second clove hitch round both spars finishes it; there are no frapping turns.',
      [ROUND_A, ROUND_B, ...ROUND_START, ...roundWraps, ...ROUND_FINISH, label(196, 214, 'Clove hitch', 'end')],
    ),
    step(
      'Tie a second round lashing near the other end of the overlap.',
      'Two round lashings, one near each end of the overlap.',
      [
        { t: 'spar', x: 74, y: 2, w: 24, h: 150, grain: 'M82 12 V60' },
        { t: 'spar', x: 102, y: 68, w: 24, h: 150, grain: 'M112 150 V200' },
        ...[82, 87, 92, 97].map((y): Shape => ({ t: 'wrap', x1: 70, y1: y, x2: 130, y2: y })),
        ...[124, 129, 134, 139].map((y): Shape => ({ t: 'wrap', x1: 70, y1: y, x2: 130, y2: y })),
        { t: 'dim', d: 'M150 68 V152 M146 68 H154 M146 152 H154' },
        { t: 'label', x: 166, y: 110, text: 'at least 1 m', anchor: 'middle', rotate: 90 },
      ],
    ),
  ],
};

// Tripod lashing --------------------------------------------------------------
// Three spars side by side; the butt ends are the thick, darker ends.
const tripodSpar = (x: number, buttUp: boolean): Shape[] => [
  { t: 'spar', x, y: 4, w: 30, h: 212, grain: `M${x + 9} 20 V70 M${x + 20} 150 V200` },
  { t: 'wrap', x1: x + 3, y1: buttUp ? 10 : 210, x2: x + 27, y2: buttUp ? 10 : 210 },
];
const TRIPOD_SPARS: Shape[] = [...tripodSpar(50, false), ...tripodSpar(85, true), ...tripodSpar(120, false)];

/** Over and under the three spars in turn, back and forth, as a figure of eight. */
function weave(passes: number): Shape[] {
  const out: Shape[] = [];
  const spars = [
    [50, 80],
    [85, 115],
    [120, 150],
  ];
  for (let j = 0; j < passes; j++) {
    const y = 76 + 10 * j;
    spars.forEach(([a, b], s) => {
      const d = `M${a - 3} ${y} L${b + 3} ${y + 4}`;
      out.push((s + j) % 2 === 0 ? rope(d) : back(d));
    });
    // Round the outside spar to start the next pass.
    if (j < passes - 1) out.push(rope(j % 2 === 0 ? `M153 ${y + 4} C160 ${y + 4} 160 ${y + 10} 153 ${y + 10}` : `M47 ${y + 4} C40 ${y + 4} 40 ${y + 10} 47 ${y + 10}`));
  }
  return out;
}
const TRIPOD_START: Shape[] = [cloveGlyph(65, 172, 30), rope('M35 181 C26 174 30 150 42 144 C46 140 47 80 47 76')];
const TRIPOD_FRAPPING: Shape[] = [82, 117].flatMap((x) => [rope(`M${x} 70 L${x} 136`), rope(`M${x + 3} 70 L${x + 3} 136`)]);

const TRIPOD_LASHING: ItemDiagrams = {
  steps: [
    step(
      'Lay three spars side by side, with the middle one pointing the other way.',
      'Three spars side by side, the middle one with its thick end at the other end.',
      [...TRIPOD_SPARS, label(100, 30, 'Thick end', 'middle'), label(35, 214, 'Thick end', 'middle'), label(165, 214, 'Thick end', 'middle')],
    ),
    step(
      'Tie a clove hitch round one of the outside spars.',
      'A clove hitch round one of the outside spars.',
      [...TRIPOD_SPARS, ...TRIPOD_START, label(196, 190, 'Clove hitch', 'end')],
    ),
    step(
      'Weave the rope over and under the spars in a figure of eight, six to eight times. Keep it loose.',
      'The rope woven over and under the three spars, back and forth, loosely.',
      [...TRIPOD_SPARS, ...TRIPOD_START, ...weave(6)],
    ),
    step(
      'Make two frapping turns in each gap between the spars.',
      'Two frapping turns in each gap between the spars.',
      [...TRIPOD_SPARS, ...TRIPOD_START, ...weave(6), ...TRIPOD_FRAPPING, label(100, 58, 'Frapping turns', 'middle')],
    ),
    step(
      'Finish with a clove hitch on the other outside spar.',
      'A clove hitch on the other outside spar finishes it.',
      [...TRIPOD_SPARS, ...TRIPOD_START, ...weave(6), ...TRIPOD_FRAPPING, rope('M153 130 C160 140 150 150 150 156'), cloveGlyph(135, 172, 30), label(100, 214, 'Clove hitch', 'middle')],
    ),
    step(
      'Cross the outside legs over the middle one and stand the tripod up.',
      'The tripod standing, its legs spread and the lashing at the top.',
      [
        { t: 'ground', x1: 10, y1: 214, x2: 190, y2: 214 },
        { t: 'pole', x1: 100, y1: 20, x2: 100, y2: 206 },
        { t: 'pole', x1: 116, y1: 22, x2: 30, y2: 206 },
        { t: 'pole', x1: 84, y1: 22, x2: 170, y2: 206 },
        ...[50, 56, 62].map((y): Shape => ({ t: 'wrap', x1: 86, y1: y, x2: 114, y2: y })),
      ],
    ),
  ],
};

export const LASHINGS: Record<string, ItemDiagrams> = {
  'square-lashing': SQUARE_LASHING,
  'diagonal-lashing': DIAGONAL_LASHING,
  'shear-lashing': SHEAR_LASHING,
  'round-lashing': ROUND_LASHING,
  'tripod-lashing': TRIPOD_LASHING,
};
