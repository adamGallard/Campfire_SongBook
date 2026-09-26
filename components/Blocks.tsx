import { Fragment, type ReactNode } from 'react';
import { inlineRuns } from '@/lib/blocks';
import type { Block } from '@/lib/types';

/**
 * Render the tiny inline vocabulary (**bold**, _italic_, newline) as React
 * elements. Nothing is ever passed to dangerouslySetInnerHTML, so a submitted
 * song containing markup is shown as the literal text a person typed.
 */
function inline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let key = 0;

  for (const run of inlineRuns(text)) {
    if (run.style === 'bold') {
      nodes.push(<strong key={`b-${key++}`}>{run.text}</strong>);
    } else if (run.style === 'italic') {
      nodes.push(<em key={`i-${key++}`}>{run.text}</em>);
    } else {
      run.text.split('\n').forEach((line, i) => {
        if (i > 0) nodes.push(<br key={`br-${key++}`} />);
        if (line) nodes.push(<Fragment key={`t-${key++}`}>{line}</Fragment>);
      });
    }
  }

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

          // The order is the point, so it is a real ordered list.
          case 'steps':
            return (
              <div className="steps" key={i}>
                {block.heading ? <div className="box-head">{block.heading}</div> : null}
                <ol className="step-list">
                  {block.items.map((item, j) => (
                    <li key={j}>
                      <span className="step-num" aria-hidden="true">
                        {j + 1}
                      </span>
                      <span>{inline(item)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );

          case 'kit':
            return (
              <div className="box kit" key={i}>
                <div className="box-head">{block.heading ?? 'Kit'}</div>
                <ul className="kit-list">
                  {block.items.map((line, j) => (
                    <li key={j}>
                      <span className="kit-qty">{line.qty === null ? '' : `${line.qty}×`}</span>
                      <span>{inline(line.item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );

          case 'safety':
            return (
              <div className="safety" role="note" key={i}>
                <div className="safety-head">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3 2 20h20L12 3ZM12 10v4M12 17v.5" />
                  </svg>
                  {block.heading ?? 'Safety check'}
                </div>
                <ul className="box-list">
                  {block.items.map((item, j) => (
                    <li key={j}>{inline(item)}</li>
                  ))}
                </ul>
              </div>
            );

          default:
            return null;
        }
      })}
    </>
  );
}
