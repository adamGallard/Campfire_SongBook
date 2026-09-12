import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ConfirmButton } from '@/components/ConfirmButton';
import { deleteSong, moveSong, togglePublished } from '../actions';

export default async function AdminSongsPage() {
  const supabase = await createClient();
  const { data: songs } = await supabase
    .from('songs')
    .select('id, slug, title, tag, category_label, published, sort_order')
    .order('sort_order');

  const list = songs ?? [];

  return (
    <main className="wrap list">
      <div className="card">
        <div className="row-actions" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 className="section-title">Songs</h2>
            <p className="muted-line" style={{ marginBottom: 0 }}>
              The order here is the order they appear round the fire.
            </p>
          </div>
          <Link href="/admin/songs/new" className="primary-btn" style={{ textDecoration: 'none' }}>
            Add a song
          </Link>
        </div>
      </div>

      <div className="card">
        {list.length === 0 ? (
          <p className="empty">No songs yet.</p>
        ) : (
          list.map((song, i) => (
            <div className="row" key={song.id}>
              <span className="num">{i + 1}</span>
              <div className="row-main">
                <div className="row-title">{song.title}</div>
                <div className="row-meta">
                  {song.category_label ?? song.tag}
                  {song.published ? '' : ' · hidden from the public page'}
                </div>
              </div>
              <div className="row-actions">
                <form action={moveSong}>
                  <input type="hidden" name="id" value={song.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button className="small-btn" type="submit" disabled={i === 0} aria-label={`Move ${song.title} up`}>
                    ↑
                  </button>
                </form>
                <form action={moveSong}>
                  <input type="hidden" name="id" value={song.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    className="small-btn"
                    type="submit"
                    disabled={i === list.length - 1}
                    aria-label={`Move ${song.title} down`}
                  >
                    ↓
                  </button>
                </form>
                <form action={togglePublished}>
                  <input type="hidden" name="id" value={song.id} />
                  <input type="hidden" name="published" value={song.published ? '0' : '1'} />
                  <button className="small-btn" type="submit">
                    {song.published ? 'Hide' : 'Show'}
                  </button>
                </form>
                <Link href={`/admin/songs/${song.id}`} className="small-btn">
                  Edit
                </Link>
                <form action={deleteSong}>
                  <input type="hidden" name="id" value={song.id} />
                  <ConfirmButton message={`Delete "${song.title}"? This cannot be undone.`}>
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
