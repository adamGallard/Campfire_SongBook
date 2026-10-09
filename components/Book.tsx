'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Blocks } from './Blocks';
import { Intro } from './Intro';
import { FootBrand, Handbooks, Masthead } from './SiteChrome';
import { blocksToPlainText } from '@/lib/blocks';
import { appName, brand } from '@/lib/brand';
import { diagramsFor } from '@/lib/diagrams';
import {
  FilterPanel,
  MoreFiltersButton,
  NO_FILTERS,
  activeCount,
  anyAvailable,
  availableFilters,
  matchesFilters,
} from './FilterChips';
import { watchLink } from '@/lib/watch';
import type { Item, Kind, Tag } from '@/lib/types';

/**
 * The whole book on one page. Every section's items ship in the initial
 * payload and switching is client-side, so a leader can move between songs and
 * skits with no signal once the page has loaded — which is the normal state of
 * affairs at a campfire, and in the corner of a field with a pile of spars.
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
  const [kind, setKind] = useState(kinds[0]?.slug ?? '');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('all');
  const [extra, setExtra] = useState(NO_FILTERS);
  const [moreOpen, setMoreOpen] = useState(false);

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

  // The extra filters only appear where a section's items carry the data.
  const available = useMemo(() => availableFilters(inKind), [inKind]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inKind.filter((i) => {
      const matchTag = tag === 'all' || i.tag === tag;
      const matchQuery = !q || (haystacks.get(i.id) ?? '').includes(q);
      return matchTag && matchQuery && matchesFilters(i, extra);
    });
  }, [inKind, query, tag, extra, haystacks]);

  function switchKind(slug: string) {
    setKind(slug);
    setTag('all');
    setExtra(NO_FILTERS);
    setQuery('');
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <Masthead />

          {/* The brand above already names the book; the title is the section. */}
          <h1>{active?.heading ?? brand.name}</h1>
          <div className="rule" />
          <p className="lede">
            {active
              ? `${inKind.length} ${inKind.length === 1 ? active.singular : active.plural}${brand.countSuffix}. ${active.lede ?? ''}`
              : 'Nothing here yet. The first pages are being checked before they go in.'}
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
            <Link href="/plan" className="ghost-btn">
              {brand.plan.label}
            </Link>
            <Link href={active ? `/submit?kind=${active.slug}` : '/submit'} className="ghost-btn">
              {active ? `Submit a ${active.singular}` : 'Send one in'}
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
            placeholder={`Search a ${active?.singular ?? 'page'} or a line…`}
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
              {anyAvailable(available) ? (
                <MoreFiltersButton
                  open={moreOpen}
                  count={activeCount(extra)}
                  onToggle={() => setMoreOpen((open) => !open)}
                  controls="more-filters"
                />
              ) : null}
            </div>
          ) : null}
          {moreOpen && anyAvailable(available) ? (
            <FilterPanel id="more-filters" available={available} value={extra} onChange={(patch) => setExtra((prev) => ({ ...prev, ...patch }))} />
          ) : null}
        </div>
      </div>

      <main className="wrap list">
        {!active ? (
          <p className="empty">The first pages are being checked. Come back soon.</p>
        ) : visible.length === 0 ? (
          <p className="empty">
            No {active.singular} matches that. Try a shorter word.
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
                <Blocks blocks={item.blocks} diagrams={diagramsFor(item.slug)} />
              </div>
              <WatchLink href={item.watch_url} />
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
          <Handbooks />
          <p className="footlinks">
            <Link href={active ? `/submit?kind=${active.slug}` : '/submit'}>
              {active ? `Submit a ${active.singular}` : 'Send one in'}
            </Link>
            <Link href="/plan">{brand.plan.label}</Link>
            <Link href="/admin">Admin</Link>
          </p>
          <p className="footmeta">
            {appName}
            {kinds.length ? ' · ' : ''}
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

/** Opens the animation on the other site; online only, unlike the rest of the book. */
function WatchLink({ href }: { href: string | null }) {
  const link = watchLink(href);
  if (!link) return null;
  return (
    <a className="watch" href={link.href} target="_blank" rel="noopener noreferrer">
      <span className="watch-play" aria-hidden="true">
        ▶
      </span>
      <span>
        Watch it tied on {link.site}
        <span className="watch-note">Opens {link.host} · online only</span>
      </span>
    </a>
  );
}
