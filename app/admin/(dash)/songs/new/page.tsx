import { SongForm } from '@/components/SongForm';
import { createClient } from '@/lib/supabase/server';
import { saveSong } from '../../actions';
import type { Tag } from '@/lib/types';

export default async function NewSongPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('tags').select('slug, label, sort_order').order('sort_order');
  const tags: Tag[] = data ?? [];

  return (
    <main className="wrap list">
      <div className="card">
        <h2 className="section-title">Add a song</h2>
        <p className="muted-line" style={{ marginBottom: 0 }}>
          It goes to the end of the running order — you can move it afterwards.
        </p>
      </div>
      <SongForm action={saveSong} tags={tags} submitLabel="Add song" />
    </main>
  );
}
