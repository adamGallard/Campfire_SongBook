import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AdminHome() {
  const supabase = await createClient();

  const [songs, published, pending, approved, rejected] = await Promise.all([
    supabase.from('items').select('id', { count: 'exact', head: true }),
    supabase.from('items').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);

  const pendingCount = pending.count ?? 0;

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
    </main>
  );
}
