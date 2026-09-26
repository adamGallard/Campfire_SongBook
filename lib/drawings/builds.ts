import type { ItemDiagrams, Shape, StepDrawing } from '../diagrams';

/** Small crossing turns where a spar is square-lashed to a leg. */
const joint = (x: number, y: number): Shape[] => [
  { t: 'wrap', x1: x - 7, y1: y - 7, x2: x + 7, y2: y + 7 },
  { t: 'wrap', x1: x + 7, y1: y - 7, x2: x - 7, y2: y + 7 },
];

// A-frame -------------------------------------------------------------------
function squareWraps(x: number): Shape[] {
  return [-6, 0, 6].flatMap((k): Shape[] => [
    { t: 'wrap', x1: x - 11 + k, y1: 244, x2: x + 11 + k, y2: 266 },
    { t: 'wrap', x1: x + 11 + k, y1: 244, x2: x - 11 + k, y2: 266 },
  ]);
}

const frameStep = (step: string, title: string, shapes: Shape[]): StepDrawing => ({
  step,
  width: 220,
  height: 220,
  title,
  shapes,
});
/** The legs lying side by side, tips level. */
const FRAME_TOGETHER: Shape[] = [
  { t: 'pole', x1: 100, y1: 20, x2: 100, y2: 205 },
  { t: 'pole', x1: 120, y1: 20, x2: 120, y2: 205 },
];
/** The legs opened into an A, crossing at the shear lashing. */
const FRAME_OPEN: Shape[] = [
  { t: 'pole', x1: 52, y1: 205, x2: 117, y2: 31 },
  { t: 'pole', x1: 168, y1: 205, x2: 103, y2: 31 },
  ...[44, 50, 56].map((y): Shape => ({ t: 'wrap', x1: 96, y1: y, x2: 124, y2: y })),
];
/** The ledger across the legs, 30 cm up, square-lashed to each. */
const FRAME_LEDGER: Shape[] = [
  { t: 'pole', x1: 40, y1: 182, x2: 180, y2: 182 },
  ...joint(61, 182),
  ...joint(159, 182),
];

export const A_FRAME: ItemDiagrams = {
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
  // Seen from above while it lies on the ground, then from the front once it
  // stands: tips at the top of each drawing, bottoms at the foot.
  steps: [
    frameStep(
      'Lay the two legs side by side on the ground, tips level.',
      'The two legs lying side by side on the ground, their tips level.',
      [...FRAME_TOGETHER, { t: 'dim', d: 'M80 20 H140' }, { t: 'label', x: 146, y: 24, text: 'Tips level' }],
    ),
    frameStep(
      'About 30 cm down from the tips, tie a **shear lashing** round both legs. Keep the turns fairly loose.',
      'A shear lashing round both legs, 30 cm down from the tips.',
      [
        ...FRAME_TOGETHER,
        ...[40, 46, 52, 58].map((y): Shape => ({ t: 'wrap', x1: 92, y1: y, x2: 128, y2: y })),
        { t: 'label', x: 136, y: 53, text: 'Shear lashing' },
        { t: 'label', x: 136, y: 67, text: 'fairly loose' },
        { t: 'dim', d: 'M76 20 V49 M72 20 H80 M72 49 H80' },
        { t: 'label', x: 68, y: 38, text: '30 cm', anchor: 'end' },
      ],
    ),
    frameStep(
      'Open the legs into an A until the bottoms are about 1.5 m apart.',
      'The legs opened into an A, crossing at the shear lashing, their bottoms 1.5 m apart.',
      [
        ...FRAME_OPEN,
        { t: 'arrow', x: 38, y: 190, angle: 180 },
        { t: 'arrow', x: 182, y: 190, angle: 0 },
        { t: 'dim', d: 'M52 212 H168 M52 208 V216 M168 208 V216' },
        { t: 'label', x: 110, y: 202, text: 'about 1.5 m', anchor: 'middle' },
      ],
    ),
    frameStep(
      'Lay the ledger across both legs, 30 cm up from the bottom, and **square-lash** it to each leg.',
      'The ledger laid across both legs near their bottoms and square-lashed to each.',
      [...FRAME_OPEN, ...FRAME_LEDGER, { t: 'label', x: 110, y: 160, text: 'Square lashings', anchor: 'middle' }],
    ),
    frameStep(
      'Stand it up and push the top gently. Tighten any lashing that slips, then have a leader check it.',
      'The finished A-frame standing, with a gentle push on its top.',
      [
        { t: 'ground', x1: 20, y1: 208, x2: 200, y2: 208 },
        ...FRAME_OPEN,
        ...FRAME_LEDGER,
        { t: 'arrow', x: 142, y: 36, angle: 180 },
        { t: 'label', x: 150, y: 40, text: 'Push gently' },
      ],
    ),
  ],
};

// Wash-bowl stand -------------------------------------------------------------
// A tripod seen from the front: the left and right legs come towards you, the
// back leg stands behind. The ring of three short staves sits at bowl height.
const standStep = (step: string, title: string, shapes: Shape[]): StepDrawing => ({
  step,
  width: 200,
  height: 220,
  title,
  shapes,
});
const STAND_BACK_LEG: Shape = { t: 'pole', x1: 100, y1: 36, x2: 100, y2: 186 };
const STAND_FRONT_LEGS: Shape[] = [
  { t: 'pole', x1: 108, y1: 34, x2: 34, y2: 206 },
  { t: 'pole', x1: 92, y1: 34, x2: 166, y2: 206 },
];
const TRIPOD_TOP: Shape[] = [48, 54, 60].map((y): Shape => ({ t: 'wrap', x1: 86, y1: y, x2: 114, y2: y }));
const GROUND: Shape = { t: 'ground', x1: 10, y1: 210, x2: 190, y2: 210 };
// The ring: two staves running back to the back leg, and one across the front.
const STAND_RING_BACK: Shape[] = [
  { t: 'pole', x1: 58, y1: 134, x2: 106, y2: 114 },
  { t: 'pole', x1: 142, y1: 134, x2: 94, y2: 114 },
];
const STAND_RING_FRONT: Shape = { t: 'pole', x1: 50, y1: 136, x2: 150, y2: 136 };
const STAND_JOINTS: Shape[] = [...joint(100, 117), ...joint(64, 136), ...joint(136, 136)];
const standWithRing = (): Shape[] => [
  GROUND,
  STAND_BACK_LEG,
  ...STAND_RING_BACK,
  ...STAND_FRONT_LEGS,
  STAND_RING_FRONT,
  ...TRIPOD_TOP,
  ...STAND_JOINTS,
];

export const WASH_BOWL_STAND: ItemDiagrams = {
  steps: [
    standStep(
      'Tie a **tripod lashing** round the three long staves, about 30 cm from their tops, and stand them up as a tripod.',
      'The three long staves tripod-lashed near their tops and standing as a tripod.',
      [
        GROUND,
        STAND_BACK_LEG,
        ...STAND_FRONT_LEGS,
        ...TRIPOD_TOP,
        { t: 'label', x: 122, y: 60, text: 'Tripod lashing' },
        { t: 'dim', d: 'M76 22 V52 M72 22 H80 M72 52 H80' },
        { t: 'label', x: 70, y: 42, text: '30 cm', anchor: 'end' },
      ],
    ),
    standStep(
      'Square-lash the three short staves across the legs, at the height the bowl should sit, to make a triangle.',
      'Three short staves square-lashed across the legs at bowl height, making a triangle.',
      [...standWithRing(), { t: 'label', x: 100, y: 166, text: 'Square lashings', anchor: 'middle' }],
    ),
    standStep(
      'Rest the bowl in the triangle. If it is loose, move the short staves up the legs until it sits snugly.',
      'The bowl resting in the triangle of short staves.',
      [
        ...standWithRing(),
        // The bowl: its body below the rim, then the rim on top.
        { t: 'solid', d: 'M64 126 C66 152 134 152 136 126 Z' },
        { t: 'solid', d: 'M64 126 C64 116 136 116 136 126 C136 135 64 135 64 126 Z' },
        { t: 'label', x: 100, y: 176, text: 'Bowl', anchor: 'middle' },
        // Up the leg, the way the short staves move if the bowl is loose.
        { t: 'arrow', x: 76, y: 106, angle: -67 },
        { t: 'label', x: 4, y: 90, text: 'Move up if loose' },
      ],
    ),
  ],
};
