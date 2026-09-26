import { ItemForm } from '@/components/ItemForm';
import { createClient } from '@/lib/supabase/server';
import { bookKinds } from '@/lib/scope';
import { saveItem } from '../../actions';
import type { Tag } from '@/lib/types';

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const supabase = await createClient();
  const [kinds, { data: tagRows }] = await Promise.all([
    bookKinds(supabase),
    supabase.from('tags').select('kind, slug, label, sort_order').order('sort_order'),
  ]);

  const tags: Tag[] = tagRows ?? [];
  const { kind } = await searchParams;
  const start = kinds.find((k) => k.slug === kind)?.slug ?? kinds[0]?.slug ?? '';

  return (
    <main className="wrap list">
      <div className="card">
        <h2 className="section-title">Add something</h2>
        <p className="muted-line" style={{ marginBottom: 0 }}>
          It goes to the end of its section — you can move it afterwards.
        </p>
      </div>
      <ItemForm
        action={saveItem}
        kinds={kinds}
        tags={tags}
        submitLabel="Add"
        initial={{ title: '', kind: start, tag: '', tune: '', category_label: '', body: '' }}
      />
    </main>
  );
}
