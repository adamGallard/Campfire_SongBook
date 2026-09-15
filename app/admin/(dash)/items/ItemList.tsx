'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ConfirmButton } from '@/components/ConfirmButton';
import { blocksToPlainText } from '@/lib/blocks';
import type { Item } from '@/lib/types';
import { deleteItem, moveItem, togglePublished } from '../actions';

type Row = Pick<Item, 'id' | 'title' | 'tag' | 'category_label' | 'tune' | 'blocks' | 'published'>;
type Show = 'all' | 'shown' | 'hidden';

/**
 * One section's running order, with a search and a shown/hidden filter.
 * Filtering is client-side so it keeps up with typing, and it survives the
 * re-render after Hide, Show or a move.
 */
export function ItemList({ items, singular, plural }: { items: Row[]; singular: string; plural: string }) {
  const [query, setQuery] = useState('');
  const [show, setShow] = useState<Show>('all');

  const haystacks = useMemo(
    () =>
      new Map(
        items.map((i) => [
          i.id,
          `${i.title} ${i.category_label ?? ''} ${i.tag} ${i.tune ?? ''} ${blocksToPlainText(i.blocks)}`.toLowerCase(),
        ]),
      ),
    [items],
  );

  const q = query.trim().toLowerCase();
  const visible = items.filter(
    (i) =>
      (show === 'all' || i.published === (show === 'shown')) &&
      (!q || (haystacks.get(i.id) ?? '').includes(q)),
  );

  // With rows missing, the arrows would swap with neighbours you cannot see.
  const filtering = q !== '' || show !== 'all';
  const shownCount = items.filter((i) => i.published).length;

  if (items.length === 0) return <p className="empty">No {plural} yet.</p>;

  return (
    <>
      <div className="list-tools">
        <input
          className="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search a ${singular} or a line…`}
          aria-label={`Search ${plural}`}
        />
        <div className="chips" role="group" aria-label="Show">
          {(
            [
              ['all', 'All', items.length],
              ['shown', 'Shown', shownCount],
              ['hidden', 'Hidden', items.length - shownCount],
            ] as const
          ).map(([key, label, count]) => (
            <button key={key} type="button" className="chip" aria-pressed={show === key} onClick={() => setShow(key)}>
              {label} <span className="chip-count">{count}</span>
            </button>
          ))}
        </div>
        {filtering && visible.length > 0 ? (
          <p className="hint">Clear the search and pick All to change the order.</p>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="empty">
          {q
            ? `No ${singular} matches that. Try a shorter word.`
            : show === 'hidden'
              ? `Nothing hidden. Every ${singular} is on the public page.`
              : `Every ${singular} is hidden from the public page.`}
        </p>
      ) : (
        visible.map((item) => {
          const i = items.indexOf(item);
          return (
            <div className="row" key={item.id}>
              <span className="num">{i + 1}</span>
              <div className="row-main">
                <div className="row-title">{item.title}</div>
                <div className="row-meta">
                  {item.category_label ?? item.tag}
                  {item.published ? '' : ' · hidden from the public page'}
                </div>
              </div>
              <div className="row-actions">
                {filtering ? null : (
                  <>
                    <form action={moveItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button className="small-btn" type="submit" disabled={i === 0} aria-label={`Move ${item.title} up`}>
                        ↑
                      </button>
                    </form>
                    <form action={moveItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        className="small-btn"
                        type="submit"
                        disabled={i === items.length - 1}
                        aria-label={`Move ${item.title} down`}
                      >
                        ↓
                      </button>
                    </form>
                  </>
                )}
                <form action={togglePublished}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="published" value={item.published ? '0' : '1'} />
                  <button className="small-btn" type="submit">
                    {item.published ? 'Hide' : 'Show'}
                  </button>
                </form>
                <Link href={`/admin/items/${item.id}`} className="small-btn">
                  Edit
                </Link>
                <form action={deleteItem}>
                  <input type="hidden" name="id" value={item.id} />
                  <ConfirmButton message={`Delete "${item.title}"? This cannot be undone.`}>Delete</ConfirmButton>
                </form>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
