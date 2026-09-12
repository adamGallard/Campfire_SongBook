import { Fragment, type ReactNode } from 'react';
import type { Block } from '@/lib/types';

/**
 * Render the tiny inline vocabulary (**bold**, _italic_, newline) as React
 * elements. Nothing is ever passed to dangerouslySetInnerHTML, so a submitted
 * song containing markup is shown as the literal text a person typed.
 */
function inline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|_([^_]+)_/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  const pushPlain = (chunk: string) => {
    if (!chunk) return;
    const lines = chunk.split('\n');
    lines.forEach((line, i) => {
      if (i > 0) nodes.push(<br key={`br-${key++}`} />);
      if (line) nodes.push(<Fragment key={`t-${key++}`}>{line}</Fragment>);
    });
  };

  while ((m = pattern.exec(text)) !== null) {
    pushPlain(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(<strong key={`b-${key++}`}>{m[1]}</strong>);
    } else {
      nodes.push(<em key={`i-${key++}`}>{m[2]}</em>);
    }
    last = m.index + m[0].length;
  }
  pushPlain(text.slice(last));

  return nodes;
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'verse':
            return (
              <p key={i}>
                {block.label ? <span className="verse-label">{block.label}</span> : null}
                {inline(block.text)}
              </p>
            );

          case 'note':
            return (
              <p className="note" key={i}>
                {inline(block.text)}
              </p>
            );

          case 'shout':
            return (
              <p className="shout" key={i}>
                {inline(block.text)}
              </p>
            );

          case 'box':
            return (
              <div className="box" key={i}>
                {block.heading ? <div className="box-head">{block.heading}</div> : null}
                <ul className="box-list">
                  {block.items.map((item, j) => (
                    <li key={j}>{inline(item)}</li>
                  ))}
                </ul>
              </div>
            );

          case 'grid':
            return (
              <div className="box" key={i}>
                {block.heading ? <div className="box-head">{block.heading}</div> : null}
                <ul className="grid-list">
                  {block.items.map((item, j) => (
                    <li key={j}>{inline(item)}</li>
                  ))}
                </ul>
              </div>
            );

          case 'pills':
            return (
              <ul className="pill-row" key={i}>
                {block.items.map((item, j) => (
                  <li className="tagpill" key={j}>
                    {item}
                  </li>
                ))}
              </ul>
            );

          default:
            return null;
        }
      })}
    </>
  );
}
