import { ItemForm } from '@/components/ItemForm';
import { createClient } from '@/lib/supabase/server';
import { saveItem } from '../../actions';
import type { Kind, Tag } from '@/lib/types';

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const supabase = await createClient();
  const [{ data: kindRows }, { data: tagRows }] = await Promise.all([
    supabase
      .from('kinds')
      .select('slug, label, heading, singular, plural, lede, sort_order, enabled')
      .order('sort_order'),
    supabase.from('tags').select('kind, slug, label, sort_order').order('sort_order'),
  ]);

  const kinds: Kind[] = kindRows ?? [];
  const tags: Tag[] = tagRows ?? [];
  const { kind } = await searchParams;
  const start = kinds.find((k) => k.slug === kind)?.slug ?? kinds[0]?.slug ?? 'song';

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
