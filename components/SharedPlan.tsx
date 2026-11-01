'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Blocks } from './Blocks';
import { WatchLink } from './Book';
import { Footer, Hero } from './SiteChrome';
import { brand } from '@/lib/brand';
import { diagramsFor } from '@/lib/diagrams';
import { readPlan } from '@/lib/share';
import type { Item, Kind, Tag } from '@/lib/types';

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A plan someone shared, read-only: the pages in the order they were put in,
 * as they are in the book today. The plan lives in the address (lib/share.ts),
 * so this page is the same static page for every link and works from the saved
 * copy with no signal.
 */
export function SharedPlan({ items, kinds, tags }: { items: Item[]; kinds: Kind[]; tags: Tag[] }) {
  const plan = readPlan(useSearchParams());

  const bySlug = useMemo(() => {
    const showing = new Set(kinds.map((k) => k.slug));
    return new Map(items.filter((i) => showing.has(i.kind)).map((i) => [i.slug, i]));
  }, [items, kinds]);

  const found = plan.slugs.flatMap((slug) => bySlug.get(slug) ?? []);
  const missing = plan.slugs.length - found.length;

  // Say which section each page is from once the plan mixes them.
  const mixed = new Set(found.map((i) => i.kind)).size > 1;
  const label = (item: Item) => {
    const tag =
      item.category_label ?? tags.find((t) => t.kind === item.kind && t.slug === item.tag)?.label ?? item.tag;
    const kind = kinds.find((k) => k.slug === item.kind);
    return mixed && kind ? `${capitalise(kind.singular)} · ${tag}` : tag;
  };

  return (
    <>
      <Hero
        title={plan.title || 'A shared plan'}
        lede={plan.group || `Put together with ${brand.plan.label.toLowerCase()}.`}
        actions={
          <>
            <Link href="/" className="ghost-btn">
              Open the book
            </Link>
            <Link href="/plan" className="ghost-btn">
              {brand.plan.label}
            </Link>
          </>
        }
      />

      <main className="wrap list">
        {found.length === 0 ? (
          <p className="empty">
            This link does not hold a plan we can find.{' '}
            <Link href="/plan">Make one</Link>, or <Link href="/">open the book</Link>.
          </p>
        ) : (
          <>
            {missing > 0 ? (
              <p className="muted-line" role="status">
                {missing === 1
                  ? '1 page in this plan is no longer in the book.'
                  : `${missing} pages in this plan are no longer in the book.`}
              </p>
            ) : null}

            {found.length > 1 ? (
              <nav className="card shared-contents" aria-label="In this plan">
                <h2 className="section-title">In this plan</h2>
                <ol>
                  {found.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.slug}`}>{item.title}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}

            {found.map((item, i) => (
              <article className="card" key={item.id} id={item.slug}>
                <div className="card-head">
                  <span className="num">{i + 1}</span>
                  <span className="pill">{label(item)}</span>
                </div>
                <h2>{item.title}</h2>
                {item.tune ? <p className="tune">{item.tune}</p> : null}
                <div className="lyrics">
                  <Blocks blocks={item.blocks} diagrams={diagramsFor(item.slug)} />
                </div>
                <WatchLink href={item.watch_url} />
              </article>
            ))}
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
