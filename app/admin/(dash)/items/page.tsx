import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ConfirmButton } from '@/components/ConfirmButton';
import { deleteItem, moveItem, togglePublished } from '../actions';
import type { Kind } from '@/lib/types';

export default async function AdminItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const supabase = await createClient();
  const [{ data: kindRows }, { data: itemRows }] = await Promise.all([
    supabase
      .from('kinds')
      .select('slug, label, heading, singular, plural, lede, sort_order, enabled')
      .order('sort_order'),
    supabase
      .from('items')
      .select('id, slug, title, kind, tag, category_label, published, sort_order')
      .order('sort_order'),
  ]);

  const kinds: Kind[] = kindRows ?? [];
  const items = itemRows ?? [];

  // One section at a time: the running order and the arrows only make sense within a section.
  const { kind: requested } = await searchParams;
  const active = kinds.find((k) => k.slug === requested) ?? kinds[0];
  const list = active ? items.filter((i) => i.kind === active.slug) : items;

  const singular = active?.singular ?? 'item';
  const plural = active?.plural ?? 'items';

  return (
    <main className="wrap list">
      <div className="card">
        <div className="row-actions" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 className="section-title">{active?.label ?? 'Content'}</h2>
            <p className="muted-line" style={{ marginBottom: 0 }}>
              The order here is the order they appear round the fire.
              {active && !active.enabled ? ' This section is switched off, so none of it shows on the public page.' : ''}
            </p>
          </div>
          <Link
            href={active ? `/admin/items/new?kind=${active.slug}` : '/admin/items/new'}
            className="primary-btn"
            style={{ textDecoration: 'none' }}
          >
            Add a {singular}
          </Link>
        </div>
        {kinds.length > 1 ? (
          <div className="chips" role="group" aria-label="Section" style={{ marginTop: 16 }}>
            {kinds.map((k) => (
              <Link
                key={k.slug}
                href={`/admin/items?kind=${k.slug}`}
                className="chip"
                aria-pressed={k.slug === active?.slug}
              >
                {k.label} <span className="chip-count">{items.filter((i) => i.kind === k.slug).length}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="card">
        {list.length === 0 ? (
          <p className="empty">No {plural} yet.</p>
        ) : (
          list.map((item, i) => (
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
                    disabled={i === list.length - 1}
                    aria-label={`Move ${item.title} down`}
                  >
                    ↓
                  </button>
                </form>
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
                  <ConfirmButton message={`Delete "${item.title}"? This cannot be undone.`}>
                    Delete
                  </ConfirmButton>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
