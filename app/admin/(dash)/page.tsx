import Link from 'next/link';
import { getAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { bookKindSlugs } from '@/lib/scope';

export default async function AdminHome() {
  const supabase = await createClient();
  // Counts for this book only; the All books page has the rest.
  const slugs = await bookKindSlugs(supabase);
  const items = () => supabase.from('items').select('id', { count: 'exact', head: true }).in('kind', slugs);
  const subs = () => supabase.from('submissions').select('id', { count: 'exact', head: true }).in('kind', slugs);

  const [songs, published, pending, approved, rejected] = await Promise.all([
    items(),
    items().eq('published', true),
    subs().eq('status', 'pending'),
    subs().eq('status', 'approved'),
    subs().eq('status', 'rejected'),
  ]);

  const pendingCount = pending.count ?? 0;
  const admin = await getAdmin();

  return (
    <main className="wrap list">
      <div className="card">
        <h2 className="section-title">The book</h2>
        <p className="muted-line">
          {published.count ?? 0} of {songs.count ?? 0} items are showing on the public page.
        </p>
        <div className="row-actions">
          <Link href="/admin/items" className="small-btn">
            Manage content
          </Link>
          <Link href="/admin/items/new" className="small-btn">
            Add something
          </Link>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Submissions</h2>
        <p className="muted-line">
          {pendingCount === 0
            ? 'Nothing waiting for review.'
            : `${pendingCount} waiting for review.`}{' '}
          {approved.count ?? 0} approved, {rejected.count ?? 0} declined so far.
        </p>
        <div className="row-actions">
          <Link href="/admin/submissions" className="small-btn">
            {pendingCount > 0 ? 'Review submissions' : 'View submissions'}
          </Link>
        </div>
      </div>

      {admin?.allBooks ? (
        <div className="card">
          <h2 className="section-title">All books</h2>
          <p className="muted-line">
            Submissions, sections and admins across Campfire, Pioneering, Bushcraft and Games.
          </p>
          <div className="row-actions">
            <Link href="/admin/all" className="small-btn">
              Open the All books page
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
