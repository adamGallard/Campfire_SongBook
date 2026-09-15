'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Blocks } from './Blocks';
import { Intro } from './Intro';
import { FootBrand, Masthead } from './SiteChrome';
import { blocksToPlainText } from '@/lib/blocks';
import type { Item, Kind, Tag } from '@/lib/types';

/**
 * The whole book on one page. Every section's items ship in the initial
 * payload and switching is client-side, so a leader can move between songs and
 * skits with no signal once the page has loaded — which is the normal state of
 * affairs at a campfire.
 */
export function Book({
  items,
  kinds,
  tags,
}: {
  items: Item[];
  kinds: Kind[];
  tags: Tag[];
}) {
  const [kind, setKind] = useState(kinds[0]?.slug ?? 'song');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('all');

  const haystacks = useMemo(
    () =>
      new Map(
        items.map((i) => [
          i.id,
          `${i.title} ${i.category_label ?? ''} ${i.tune ?? ''} ${blocksToPlainText(i.blocks)}`.toLowerCase(),
        ]),
      ),
    [items],
  );

  const active = kinds.find((k) => k.slug === kind) ?? kinds[0];
  const inKind = useMemo(() => items.filter((i) => i.kind === kind), [items, kind]);
  const kindTags = useMemo(
    () => tags.filter((t) => t.kind === kind).sort((a, b) => a.sort_order - b.sort_order),
    [tags, kind],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inKind.filter((i) => {
      const matchTag = tag === 'all' || i.tag === tag;
      const matchQuery = !q || (haystacks.get(i.id) ?? '').includes(q);
      return matchTag && matchQuery;
    });
  }, [inKind, query, tag, haystacks]);

  function switchKind(slug: string) {
    setKind(slug);
    setTag('all');
    setQuery('');
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <Masthead />

          {/* The brand above already says Campfire; the title is the section. */}
          <h1>{active?.heading}</h1>
          <div className="rule" />
          <p className="lede">
            {inKind.length} {inKind.length === 1 ? active?.singular : active?.plural} for the
            fire. {active?.lede}
          </p>

          {kinds.length > 1 ? (
            <div className="sections" role="tablist" aria-label="Section">
              {kinds.map((k) => (
                <button
                  key={k.slug}
                  type="button"
                  role="tab"
                  className="section-btn"
                  aria-selected={k.slug === kind}
                  onClick={() => switchKind(k.slug)}
                >
                  {k.label}
                  <span className="section-count">
                    {items.filter((i) => i.kind === k.slug).length}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="hero-actions">
            <Link href="/export" className="ghost-btn">
              Make a PDF
            </Link>
            <Link href={`/submit?kind=${active?.slug ?? 'song'}`} className="ghost-btn">
              Submit a {active?.singular ?? 'song'}
            </Link>
          </div>
        </div>
      </header>

      <div className="wrap">
        <Intro />
      </div>

      <div className="searchbar">
        <div className="wrap">
          <input
            className="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search a ${active?.singular ?? 'song'} or a line…`}
            aria-label={`Search ${active?.label ?? ''}`}
          />
          {kindTags.length > 0 ? (
            <div className="chips" role="group" aria-label="Filter">
              <button
                type="button"
                className="chip"
                aria-pressed={tag === 'all'}
                onClick={() => setTag('all')}
              >
                All {inKind.length}
              </button>
              {kindTags.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  className="chip"
                  aria-pressed={tag === t.slug}
                  onClick={() => setTag(t.slug)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <main className="wrap list">
        {visible.length === 0 ? (
          <p className="empty">
            No {active?.singular ?? 'item'} matches that. Try a shorter word.
          </p>
        ) : (
          visible.map((item, i) => (
            <article className="card" key={item.id} id={item.slug}>
              <div className="card-head">
                <span className="num">{i + 1}</span>
                <span className="pill">{item.category_label ?? item.tag}</span>
              </div>
              <h2>{item.title}</h2>
              {item.tune ? <p className="tune">{item.tune}</p> : null}
              <div className="lyrics">
                <Blocks blocks={item.blocks} />
              </div>
            </article>
          ))
        )}
      </main>

      <footer className="footer">
        <div className="wrap">
          <FootBrand />
          <p className="footlede">
            Joeys, Cubs, Scouts, Venturers and Rovers — learning, leading and living life to the
            fullest.
          </p>
          <p className="footlinks">
            <Link href={`/submit?kind=${active?.slug ?? 'song'}`}>
              Submit a {active?.singular ?? 'song'}
            </Link>
            <Link href="/export">Make a PDF</Link>
            <Link href="/admin">Admin</Link>
          </p>
          <p className="footmeta">
            ScoutBase Campfire ·{' '}
            {kinds
              .map((k) => {
                const n = items.filter((i) => i.kind === k.slug).length;
                return `${n} ${n === 1 ? k.singular : k.plural}`;
              })
              .join(' · ')}
          </p>
        </div>
      </footer>
    </>
  );
}
