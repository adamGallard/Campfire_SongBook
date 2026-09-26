import { notFound } from 'next/navigation';
import { ItemForm } from '@/components/ItemForm';
import { createClient } from '@/lib/supabase/server';
import { bookKinds } from '@/lib/scope';
import { blocksToBody, sanitizeBlocks } from '@/lib/blocks';
import { saveItem } from '../../actions';
import type { Item, Tag } from '@/lib/types';

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: row }, kinds, { data: tagRows }] = await Promise.all([
    supabase.from('items').select('*').eq('id', id).maybeSingle(),
    bookKinds(supabase),
    supabase.from('tags').select('kind, slug, label, sort_order').order('sort_order'),
  ]);

  // The other book's items are edited on the other book's site.
  if (!row || !kinds.some((k) => k.slug === row.kind)) notFound();

  const item: Item = { ...row, blocks: sanitizeBlocks(row.blocks) } as Item;
  const tags: Tag[] = tagRows ?? [];

  return (
    <main className="wrap list">
      <div className="card">
        <h2 className="section-title">Edit</h2>
        <p className="muted-line" style={{ marginBottom: 0 }}>
          Last changed{' '}
          {new Date(item.updated_at).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          .
        </p>
      </div>
      <ItemForm
        action={saveItem}
        kinds={kinds}
        tags={tags}
        item={item}
        submitLabel="Save"
        initial={{
          title: item.title,
          kind: item.kind,
          tag: item.tag,
          tune: item.tune ?? '',
          category_label: item.category_label ?? '',
          body: blocksToBody(item.blocks),
        }}
      />
    </main>
  );
}
