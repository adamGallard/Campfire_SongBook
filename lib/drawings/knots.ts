import type { ItemDiagrams, Shape, StepDrawing } from '../diagrams';

/**
 * Knot drawings. Each step records the words of the step it shows (see
 * lib/diagrams.ts); change the seed text and these together.
 */

// Clove hitch ---------------------------------------------------------------
// A vertical spar seen from the front. The rope comes in from the left; parts
// that pass behind the spar are dashed.
export const CLOVE_SPAR: Shape = { t: 'spar', x: 85, y: 8, w: 30, h: 204, grain: 'M94 22 V96 M94 176 V200 M105 30 V70 M106 186 V204' };
export const CLOVE = {
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

export const CLOVE_HITCH: ItemDiagrams = {
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

// Shared helpers for the knots below --------------------------------------------
const knotStep = (step: string, title: string, shapes: Shape[]): StepDrawing => ({
  step,
  width: 200,
  height: 220,
  title,
  shapes,
});
const rope = (d: string, tone?: 'b'): Shape => ({ t: 'rope', d, tone });
const back = (d: string): Shape => ({ t: 'rope', d, back: true });
const arrow = (x: number, y: number, angle: number): Shape => ({ t: 'arrow', x, y, angle });
const label = (x: number, y: number, text: string, anchor?: 'start' | 'middle' | 'end'): Shape => ({
  t: 'label',
  x,
  y,
  text,
  anchor,
});

// Round turn and two half hitches ------------------------------------------------
// The pole from the clove hitch; the standing part leads off to the right.
const RT = {
  firstBack: 'M116 72 L84 79',
  secondBack: 'M116 89 L84 96',
  standing: 'M198 72 H116',
  firstTurn: 'M84 79 L116 89',
  secondTurn: 'M84 96 L116 106',
};
const ROUND_TURN: Shape[] = [back(RT.firstBack), back(RT.secondBack)];

/**
 * A half hitch round the standing part: the end rises in front of it (`rise`,
 * from `from`), goes over the top and down behind it (`loop`), then passes
 * under its own rising part and on (`tuck`).
 */
function halfHitch(left: number, from: [number, number], tuckTo: string) {
  const right = left + 16;
  return {
    loop: rope(`M${right} 62 C${right} 52 ${left} 52 ${left} 62 L${left} 84`),
    tuck: rope(`M${left} 84 C${left} 92 ${left + 6} 95 ${left + 20} 95 ${tuckTo}`),
    rise: rope(`M${from[0]} ${from[1]} C${from[0] + 12} ${from[1]} ${right - 4} ${from[1] - 6} ${right - 2} 86 L${right} 62`),
  };
}

function roundTurnHitches(offset: number, second: boolean, pull: boolean): Shape[] {
  const h1 = halfHitch(144 + offset, [116, 106], second ? '' : 'H182');
  const h2 = halfHitch(174 + offset, [164 + offset, 95], `L${196 + offset / 2} 100`);
  return [
    ...ROUND_TURN,
    h1.loop,
    ...(second ? [h2.loop] : []),
    rope(RT.standing),
    h1.tuck,
    ...(second ? [h2.tuck] : []),
    rope(RT.firstTurn),
    rope(RT.secondTurn),
    h1.rise,
    ...(second ? [h2.rise] : []),
    ...(pull ? [arrow(193, 72, 0), label(196, 60, 'Pull', 'end')] : []),
  ];
}

export const ROUND_TURN_TWO_HALF_HITCHES: ItemDiagrams = {
  steps: [
    knotStep(
      'Take the end round the pole twice. These two turns are the round turn, and they take the strain.',
      'The rope taken twice round the pole: the round turn.',
      [
        CLOVE_SPAR,
        ...ROUND_TURN,
        rope(RT.standing),
        rope(RT.firstTurn),
        rope(RT.secondTurn),
        rope('M116 106 C132 108 142 116 146 130'),
        arrow(146, 132, 75),
        label(196, 60, 'Standing part', 'end'),
        label(80, 124, 'Round turn', 'end'),
      ],
    ),
    knotStep(
      'Bring the end over the standing part, round it and back through, to make a half hitch.',
      'The end taken over the standing part, round it and back through: one half hitch.',
      [CLOVE_SPAR, ...roundTurnHitches(0, false, false), arrow(184, 95, 0)],
    ),
    knotStep(
      'Make a second half hitch the same way, just below the first, going round in the same direction.',
      'A second half hitch beside the first, going round the same way.',
      [CLOVE_SPAR, ...roundTurnHitches(0, true, false), arrow(198, 100, 15)],
    ),
    knotStep(
      'Slide both half hitches up to the round turn and pull tight.',
      'Both half hitches slid up against the round turn, and the standing part pulled tight.',
      [CLOVE_SPAR, ...roundTurnHitches(-14, true, true)],
    ),
  ],
};

// Timber hitch -----------------------------------------------------------------
// The standing part leads off to the right; the end goes round the spar, round
// the standing part, and twists back round its own part against the spar.
const TH = {
  back: 'M118 90 L82 96',
  standing: 'M198 90 H118',
  loop: 'M82 96 C78 97 80 104 86 104 L112 106',
  under: 'M112 106 C126 106 132 100 134 92 L136 80',
  over: 'M136 80 C138 72 150 72 150 80 L148 96 C146 102 136 100 124 98',
};
// Twists: over the loop, under it, over it, three times, working to the left.
const TWIST_UNDER = ['M110 112 L104 94', 'M96 110 L92 94'];
const TWIST_OVER = ['M124 98 C120 96 118 94 118 94 L110 112', 'M104 94 L96 110', 'M92 94 L86 108 C82 114 80 120 78 126'];
const timberTwisted = (pull: boolean): Shape[] => [
  CLOVE_SPAR,
  back(TH.back),
  rope(TH.under),
  ...TWIST_UNDER.map((d) => rope(d)),
  rope(TH.loop),
  rope(TH.standing),
  rope(TH.over),
  ...TWIST_OVER.map((d) => rope(d)),
  ...(pull ? [arrow(196, 90, 0), label(196, 80, 'Pull', 'end')] : [arrow(78, 128, 110), label(72, 150, 'Twists', 'end')]),
];

export const TIMBER_HITCH: ItemDiagrams = {
  steps: [
    knotStep('Take the end round the spar.', 'The end taken round the spar.', [
      CLOVE_SPAR,
      back(TH.back),
      rope(TH.standing),
      rope(TH.loop),
      rope('M112 106 C124 108 130 114 132 126'),
      arrow(132, 128, 85),
      label(196, 80, 'Standing part', 'end'),
    ]),
    knotStep('Pass it round the standing part.', 'The end passed round the standing part.', [
      CLOVE_SPAR,
      back(TH.back),
      rope(TH.under),
      rope(TH.loop),
      rope(TH.standing),
      rope(TH.over),
      arrow(122, 98, 190),
    ]),
    knotStep(
      'Twist the end back round its own part at least three times, so the twists lie along the spar.',
      'The end twisted three times round its own part, lying against the spar.',
      timberTwisted(false),
    ),
    knotStep(
      'Pull on the standing part until the loop grips the spar.',
      'The standing part pulled until the loop grips the spar.',
      timberTwisted(true),
    ),
  ],
};

// Reef knot --------------------------------------------------------------------
// One rope's two ends, in two colours so each can be followed: the left end in
// natural, the right end in grey-blue.
const REEF = {
  // The left end's bend, open to the left: standing part along the top.
  left: 'M8 90 H140 C160 90 160 130 140 130 H40',
  // The right end's bend, open to the right, its arms crossing the left end's.
  rightInTop: 'M192 100 H96',
  rightInCross: 'M96 100 C80 100 76 80 60 80',
  rightTurn: 'M60 80 C40 80 40 140 60 140',
  rightOutCross: 'M60 140 C76 140 80 120 96 120',
  rightOut: 'M96 120 H160',
};
const reefFinished = (arrows: Shape[]): Shape[] => [
  rope(REEF.rightInCross, 'b'),
  rope(REEF.rightTurn, 'b'),
  rope(REEF.rightOut, 'b'),
  rope(REEF.left),
  rope(REEF.rightInTop, 'b'),
  rope(REEF.rightOutCross, 'b'),
  ...arrows,
];

export const REEF_KNOT: ItemDiagrams = {
  steps: [
    knotStep(
      'Right end over left end, and under.',
      'The right end crossed over the left end and tucked under it, twisting the two together once.',
      [
        rope('M8 150 C50 150 80 136 100 120 C108 114 110 106 104 100', undefined),
        rope('M192 140 C150 140 118 130 100 118 C92 112 90 104 96 98', 'b'),
        rope('M96 98 C104 92 110 80 118 64', 'b'),
        rope('M104 100 C96 94 90 82 82 64'),
        arrow(82, 62, -110),
        arrow(118, 62, -70),
        label(8, 172, 'Left end'),
        label(192, 172, 'Right end', 'end'),
      ],
    ),
    knotStep(
      'Left end over right end, and under.',
      'The ends crossed back the other way, left over right and under, making two bends that hold each other.',
      reefFinished([arrow(38, 130, 180), arrow(162, 120, 0)]),
    ),
    knotStep('Pull both ends to tighten.', 'The finished reef knot pulled tight, each end lying beside its own standing part.', [
      ...reefFinished([arrow(6, 90, 180), arrow(194, 100, 0)]),
      label(100, 186, 'Each end lies beside its own part', 'middle'),
    ]),
  ],
};

// Sheet bend -------------------------------------------------------------------
// The thicker rope (natural) makes the bend, open to the left; the thinner
// rope is grey-blue. The thinner rope comes up through the bend from below,
// goes over the top leg, round behind both legs, comes back over the bottom
// leg and tucks under its own part.
const SB = {
  thick: 'M8 90 H120 C150 90 150 130 120 130 H70',
  thinUp: 'M104 214 C104 170 104 132 104 112',
  thinOverTop: 'M104 112 C104 100 102 90 100 80 C98 70 90 68 84 74',
  thinBehind: 'M84 74 C82 82 84 90 84 100 L84 140 C84 150 96 154 106 152 C112 150 114 144 114 138',
  thinTuck: 'M114 138 C114 126 112 114 104 110 L40 110',
};

export const SHEET_BEND: ItemDiagrams = {
  steps: [
    knotStep('Make a bend (a U shape) in the end of the thicker rope.', 'The thicker rope bent back on itself into a U.', [
      rope(SB.thick),
      label(8, 78, 'Thicker rope'),
      label(150, 160, 'The bend', 'middle'),
    ]),
    knotStep(
      'Bring the end of the thinner rope up through the bend from underneath.',
      'The thinner rope brought up through the bend from underneath.',
      [rope(SB.thinUp, 'b'), rope(SB.thick), arrow(104, 108, -90), label(112, 206, 'Thinner rope')],
    ),
    knotStep(
      'Take it round behind both sides of the bend.',
      'The thinner rope taken over the top and round behind both sides of the bend.',
      [rope(SB.thinUp, 'b'), rope(SB.thinBehind, 'b'), rope(SB.thick), rope(SB.thinOverTop, 'b'), arrow(114, 134, -90)],
    ),
    knotStep(
      'Tuck it under itself, but not back through the bend.',
      'The end tucked under its own part, on top of the bend.',
      [
        rope(SB.thinUp, 'b'),
        rope(SB.thinBehind, 'b'),
        rope(SB.thick),
        rope(SB.thinTuck, 'b'),
        rope(SB.thinOverTop, 'b'),
        arrow(38, 110, 180),
      ],
    ),
    knotStep('Hold the bend and pull the thinner rope tight.', 'The finished sheet bend, with both short ends on the same side.', [
      rope(SB.thinUp, 'b'),
      rope(SB.thinBehind, 'b'),
      rope(SB.thick),
      rope(SB.thinTuck, 'b'),
      rope(SB.thinOverTop, 'b'),
      arrow(104, 216, 90),
      arrow(6, 90, 180),
      label(40, 150, 'Short ends', 'middle'),
    ]),
  ],
};

// Bowline ----------------------------------------------------------------------
// The standing part hangs from the top. The small loop is the rabbit's hole;
// the standing part above it is the tree.
const BW = {
  standing: 'M100 6 L100 58',
  // The small loop, the rope nearest the end crossing on top of the standing part.
  hole: 'M100 58 C100 70 118 72 118 86 C118 100 98 104 88 96 C80 90 82 76 92 72 L108 66',
  // On down to form the big loop.
  down: 'M108 66 C122 60 132 90 132 120 C132 160 116 190 94 190 C72 190 60 170 60 150',
  upUnder: 'M60 150 C60 130 72 112 90 104',
  upOver: 'M90 104 C96 100 100 92 102 80 C104 64 104 50 108 40',
  roundTree: 'M108 40 C110 30 94 28 90 38',
  downHole: 'M90 38 C88 50 90 64 94 76',
  downOut: 'M94 76 C96 88 96 98 96 110',
};
const BOWLINE_BASE: Shape[] = [rope(BW.standing), rope(BW.hole), rope(BW.down)];

export const BOWLINE: ItemDiagrams = {
  steps: [
    knotStep(
      "Make a small loop in the standing part, with the part nearest the end lying on top. This is the rabbit's hole.",
      'A small loop made in the standing part, the part nearest the end crossing on top.',
      [...BOWLINE_BASE, arrow(60, 146, -90), label(136, 90, 'Small loop'), label(106, 20, 'Standing part')],
    ),
    knotStep(
      'Bring the end up through the small loop from underneath: the rabbit comes out of the hole.',
      'The end brought up through the small loop from underneath.',
      [rope(BW.upUnder), ...BOWLINE_BASE, rope(BW.upOver), arrow(108, 38, -75)],
    ),
    knotStep(
      'Take the end round behind the standing part: round the tree.',
      'The end taken round behind the standing part.',
      [rope(BW.upUnder), rope(BW.roundTree), ...BOWLINE_BASE, rope(BW.upOver), arrow(90, 40, 100)],
    ),
    knotStep(
      'Bring it back down through the small loop: back down the hole.',
      'The end brought back down through the small loop, beside its own part.',
      [rope(BW.upUnder), rope(BW.roundTree), rope(BW.downOut), ...BOWLINE_BASE, rope(BW.upOver), rope(BW.downHole), arrow(96, 112, 90)],
    ),
    knotStep(
      'Hold the end against the side of the big loop, and pull the standing part to tighten.',
      'The finished bowline: the standing part pulled tight, the big loop fixed.',
      [
        rope(BW.upUnder),
        rope(BW.roundTree),
        rope(BW.downOut),
        ...BOWLINE_BASE,
        rope(BW.upOver),
        rope(BW.downHole),
        arrow(100, 4, -90),
        label(40, 200, 'Big loop'),
      ],
    ),
  ],
};
