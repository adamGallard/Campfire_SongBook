import type { Drawing, Overview, Shape } from '@/lib/diagrams';

/**
 * Draws a diagram from lib/diagrams.ts in the page's colours. Every colour is
 * a CSS token (app/globals.css), so drawings follow day and night mode.
 */
function ShapeView({ shape }: { shape: Shape }) {
  switch (shape.t) {
    case 'spar':
      return (
        <g
          transform={
            shape.angle ? `rotate(${shape.angle} ${shape.x + shape.w / 2} ${shape.y + shape.h / 2})` : undefined
          }
        >
          <rect className="dg-spar" x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={5} />
          {shape.grain ? <path className="dg-grain" d={shape.grain} /> : null}
        </g>
      );
    case 'pole':
      return (
        <>
          <line className="dg-pole-edge" x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} />
          <line className="dg-pole" x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} />
        </>
      );
    case 'rope': {
      const back = shape.back ? ' dg-back' : '';
      const tone = shape.tone === 'b' ? ' dg-tone-b' : '';
      return (
        <>
          <path className={`dg-rope-edge${back}${tone}`} d={shape.d} />
          <path className={`dg-rope${back}${tone}`} d={shape.d} />
        </>
      );
    }
    case 'wrap':
      return (
        <>
          <line className="dg-wrap-edge" x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} />
          <line className="dg-wrap" x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} />
        </>
      );
    case 'arrow':
      return (
        <path
          className="dg-arrow"
          d="M-2 -6 L9 0 L-2 6 Z"
          transform={`translate(${shape.x} ${shape.y}) rotate(${shape.angle})`}
        />
      );
    case 'label':
      return (
        <text
          className="dg-label"
          x={shape.x}
          y={shape.y}
          textAnchor={shape.anchor ?? 'start'}
          transform={shape.rotate ? `rotate(${shape.rotate} ${shape.x} ${shape.y})` : undefined}
        >
          {shape.text}
        </text>
      );
    case 'dim':
      return <path className="dg-dim" d={shape.d} />;
    case 'ground':
      return <line className="dg-ground" x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} />;
    case 'callout':
      return (
        <g className="dg-callout">
          <line x1={shape.to[0]} y1={shape.to[1]} x2={shape.x} y2={shape.y} />
          <circle cx={shape.x} cy={shape.y} r={12} />
          <text x={shape.x} y={shape.y + 4.5} textAnchor="middle">
            {shape.letter}
          </text>
        </g>
      );
    case 'solid':
      return <path className="dg-solid" d={shape.d} />;
    case 'group':
      return (
        <g transform={shape.transform}>
          {shape.shapes.map((s, i) => (
            <ShapeView key={i} shape={s} />
          ))}
        </g>
      );
  }
}

export function Diagram({ drawing }: { drawing: Drawing }) {
  return (
    <svg
      className="diagram"
      viewBox={`0 0 ${drawing.width} ${drawing.height}`}
      role="img"
      aria-label={drawing.title}
    >
      {drawing.shapes.map((shape, i) => (
        <ShapeView key={i} shape={shape} />
      ))}
    </svg>
  );
}

/** A drawing of the whole build, with what each lettered marker shows. */
export function OverviewFigure({ overview }: { overview: Overview }) {
  return (
    <figure className="overview">
      <Diagram drawing={overview} />
      {overview.legend?.length ? (
        <figcaption>
          <ul className="legend">
            {overview.legend.map((l) => (
              <li key={l.letter}>
                <span className="legend-tag" aria-hidden="true">
                  {l.letter}
                </span>
                <span>
                  <strong>{l.name}</strong> {l.where}
                </span>
              </li>
            ))}
          </ul>
        </figcaption>
      ) : null}
    </figure>
  );
}
