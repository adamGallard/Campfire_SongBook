import type { ItemDiagrams, Shape } from '../diagrams';

// A-frame -------------------------------------------------------------------
function squareWraps(x: number): Shape[] {
  return [-6, 0, 6].flatMap((k): Shape[] => [
    { t: 'wrap', x1: x - 11 + k, y1: 244, x2: x + 11 + k, y2: 266 },
    { t: 'wrap', x1: x + 11 + k, y1: 244, x2: x - 11 + k, y2: 266 },
  ]);
}

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
};
