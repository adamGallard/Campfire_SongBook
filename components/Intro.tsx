'use client';

import { useEffect, useState } from 'react';
import { brand } from '@/lib/brand';

/**
 * Site-level "what is this" for a first-time visitor.
 *
 * Shown/hidden purely through a `data-intro` attribute on <html>, set before
 * paint by the script in the layout. React always renders the same markup and
 * CSS decides what is visible, so a returning visitor never sees the panel
 * flash open before it collapses.
 */
export function Intro() {
  // Mirrors the attribute purely so screen readers get a truthful
  // aria-expanded; what is actually visible is decided by CSS.
  const [shown, setShown] = useState(true);

  useEffect(() => {
    setShown(document.documentElement.dataset.intro !== 'hidden');
  }, []);

  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.intro === 'hidden' ? 'shown' : 'hidden';
    root.dataset.intro = next;
    setShown(next === 'shown');
    try {
      localStorage.setItem('songbook:intro', next);
    } catch {
      /* the choice just will not persist */
    }
  }

  return (
    <aside className="intro" aria-label="About this book">
      <div className="intro-head">
        <h2 className="intro-title">{brand.intro.title}</h2>
        <button
          type="button"
          className="intro-toggle"
          onClick={toggle}
          aria-controls="intro-body"
          aria-expanded={shown}
        >
          <span className="intro-when-shown">Hide</span>
          <span className="intro-when-hidden">What is this?</span>
        </button>
      </div>

      <div className="intro-body" id="intro-body">
        <p className="intro-lede">{brand.intro.lede}</p>
        <ul className="intro-points">
          <li>
            <strong>Search</strong> {brand.intro.search}
          </li>
          <li>
            <strong>Night mode</strong> (the moon, top right) {brand.intro.night}, and{' '}
            <strong>Big type</strong> (the Aa) makes it readable at arm's length.
          </li>
          <li>
            <strong>No signal at camp?</strong> Once you have opened the book on your phone it keeps
            working without a connection. Add it to your home screen to find it easily.
          </li>
          <li>
            <strong>{brand.plan.label}</strong>: {brand.intro.plan}
          </li>
          <li>
            <strong>Know one we are missing?</strong> Send it in — a leader reads everything before
            it appears here.
          </li>
        </ul>
      </div>
    </aside>
  );
}
