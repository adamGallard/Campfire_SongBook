import { notFound } from 'next/navigation';
import { SongForm } from '@/components/SongForm';
import { createClient } from '@/lib/supabase/server';
import { blocksToBody, sanitizeBlocks } from '@/lib/blocks';
import { saveSong } from '../../actions';
import type { Song, Tag } from '@/lib/types';

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: row }, { data: tagRows }] = await Promise.all([
    supabase.from('songs').select('*').eq('id', id).maybeSingle(),
    supabase.from('tags').select('slug, label, sort_order').order('sort_order'),
  ]);

  if (!row) notFound();

  const song: Song = { ...row, blocks: sanitizeBlocks(row.blocks) } as Song;
  const tags: Tag[] = tagRows ?? [];

  return (
    <main className="wrap list">
      <div className="card">
        <h2 className="section-title">Edit song</h2>
        <p className="muted-line" style={{ marginBottom: 0 }}>
          Last changed {new Date(song.updated_at).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          .
        </p>
      </div>
      <SongForm
        action={saveSong}
        tags={tags}
        song={song}
        initial={{
          title: song.title,
          tag: song.tag,
          tune: song.tune ?? '',
          category_label: song.category_label ?? '',
          body: blocksToBody(song.blocks),
        }}
      />
    </main>
  );
}
