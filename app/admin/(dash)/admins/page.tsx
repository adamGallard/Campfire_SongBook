import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { brand, BOOK } from '@/lib/brand';

/**
 * Admins who look after every book manage the list on the All books page.
 * Everyone else sees, read-only, who looks after this book.
 */
export default async function AdminsPage() {
  const me = await requireAdmin();
  if (me.allBooks) redirect('/admin/all#admins');

  const supabase = await createClient();
  const { data } = await supabase.from('admins').select('email, note, books').order('email');
  const admins = (data ?? []).filter(
    (a: { books: string[] | null }) => a.books === null || a.books.includes(BOOK),
  );

  return (
    <main className="wrap list">
      <div className="card">
        <h2 className="section-title">Who looks after {brand.name}</h2>
        <p className="muted-line" style={{ marginBottom: 0 }}>
          Anyone here can edit the book and review its submissions. Ask an admin for every book to
          add someone, or to change who looks after what.
        </p>
      </div>

      <div className="card">
        {admins.map((a: { email: string; note: string | null; books: string[] | null }) => (
          <div className="row" key={a.email}>
            <div className="row-main">
              <div className="row-title">{a.email}</div>
              <div className="row-meta">
                {a.email.toLowerCase() === me.email.toLowerCase() ? 'You · ' : ''}
                {a.books === null ? 'Every book' : `${brand.name}${a.books.length > 1 ? ' and others' : ''}`}
                {a.note ? ` · ${a.note}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="hint">
        <Link href="/admin">Back to the overview</Link>
      </p>
    </main>
  );
}
