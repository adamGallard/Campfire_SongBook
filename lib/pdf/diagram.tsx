import { Circle, G, Line, Path, Rect, Svg, Text } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import type { Drawing, Shape } from '../diagrams';

// Printed often in black and white, so the drawings are ink on white: rope
// is a white band with an ink edge, timber a light grey.
const INK = '#0d1b2a';
const MUTED = '#60707a';
const TIMBER = '#d6d6d6';
const GRAIN = '#9aa3a8';
const WHITE = '#ffffff';
/** The second rope prints mid grey, so the two can be told apart in ink. */
const TONE_B = '#9aa3a8';

function ShapeView({ shape }: { shape: Shape }) {
  switch (shape.t) {
    case 'spar':
      return (
        <G transform={shape.angle ? `rotate(${shape.angle} ${shape.x + shape.w / 2} ${shape.y + shape.h / 2})` : undefined}>
          <Rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={5} fill={TIMBER} stroke={INK} strokeWidth={1.5} />
          {shape.grain ? <Path d={shape.grain} fill="none" stroke={GRAIN} strokeWidth={1.2} strokeLinecap="round" /> : null}
        </G>
      );
    case 'pole':
      return (
        <G>
          <Line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={INK} strokeWidth={15} strokeLinecap="round" />
          <Line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={TIMBER} strokeWidth={12} strokeLinecap="round" />
        </G>
      );
    case 'rope': {
      const back = shape.back ? { opacity: 0.45, strokeDasharray: '5 5' } : {};
      return (
        <G>
          <Path d={shape.d} fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" {...back} />
          <Path d={shape.d} fill="none" stroke={shape.tone === 'b' ? TONE_B : WHITE} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" {...back} />
        </G>
      );
    }
    case 'wrap':
      return (
        <G>
          <Line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
          <Line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" />
        </G>
      );
    case 'arrow':
      return <Path d="M-2 -6 L9 0 L-2 6 Z" fill={INK} transform={`translate(${shape.x} ${shape.y}) rotate(${shape.angle})`} />;
    case 'label':
      return (
        <Text
          x={shape.x}
          y={shape.y}
          textAnchor={shape.anchor ?? 'start'}
          fill={INK}
          transform={shape.rotate ? `rotate(${shape.rotate} ${shape.x} ${shape.y})` : undefined}
          style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600 }}
        >
          {shape.text}
        </Text>
      );
    case 'dim':
      return <Path d={shape.d} fill="none" stroke={MUTED} strokeWidth={1} />;
    case 'ground':
      return <Line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={GRAIN} strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" />;
    case 'callout':
      return (
        <G>
          <Line x1={shape.to[0]} y1={shape.to[1]} x2={shape.x} y2={shape.y} stroke={INK} strokeWidth={1.5} />
          <Circle cx={shape.x} cy={shape.y} r={12} fill={INK} />
          <Text x={shape.x} y={shape.y + 4.5} textAnchor="middle" fill={WHITE} style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700 }}>
            {shape.letter}
          </Text>
        </G>
      );
    case 'solid':
      return <Path d={shape.d} fill={WHITE} stroke={INK} strokeWidth={1.5} />;
    case 'group':
      return (
        <G transform={shape.transform}>
          {shape.shapes.map((s, i) => (
            <ShapeView key={i} shape={s} />
          ))}
        </G>
      );
  }
}

/** A drawing from lib/diagrams.ts, scaled to `width` points. */
export function PdfDiagram({ drawing, width, style }: { drawing: Drawing; width: number; style?: Style }) {
  return (
    <Svg
      viewBox={`0 0 ${drawing.width} ${drawing.height}`}
      style={[{ width, height: (width * drawing.height) / drawing.width }, style ?? {}]}
    >
      {drawing.shapes.map((shape, i) => (
        <ShapeView key={i} shape={shape} />
      ))}
    </Svg>
  );
}
