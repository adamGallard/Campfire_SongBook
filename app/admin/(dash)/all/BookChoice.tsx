'use client';

import { useState } from 'react';
import type { BookSlug } from '@/lib/brand';

/**
 * "All books" or some of them. Ticking All books greys out the rest, since an
 * every-book admin also gets every book added later.
 */
export function BookChoice({
  books,
  initial,
}: {
  books: { slug: BookSlug; name: string }[];
  /** null for every book. */
  initial: BookSlug[] | null;
}) {
  const [all, setAll] = useState(initial === null);

  return (
    <fieldset className="field">
      <legend className="field-label">Books they look after</legend>
      <div className="check-row">
        <label className="check">
          <input
            type="checkbox"
            name="all_books"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
          />{' '}
          All books
        </label>
        {books.map((b) => (
          <label key={b.slug} className="check book-check" data-tag={b.slug} aria-disabled={all}>
            <input
              type="checkbox"
              name="books"
              value={b.slug}
              disabled={all}
              defaultChecked={initial?.includes(b.slug) ?? false}
            />{' '}
            {b.name}
          </label>
        ))}
      </div>
      <p className="hint">
        {all
          ? 'Can manage every book, add and remove admins, and use this page.'
          : 'Can edit content and review submissions in the ticked books only, on each book’s own site.'}
      </p>
    </fieldset>
  );
}
