import Link from 'next/link';
import { ReadingToggles } from '@/components/ReadingPrefs';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { signOut } from './actions';

export const metadata = { title: 'Admin' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  const supabase = await createClient();
  const { count } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  const pending = count ?? 0;

  return (
    <>
      <div className="admin-bar">
        <div className="wrap">
          <strong className="footname">Campfire admin</strong>
          <nav className="admin-nav">
            <Link href="/admin">Overview</Link>
            <Link href="/admin/items">Content</Link>
            <Link href="/admin/submissions">
              Submissions {pending > 0 ? <span className="badge">{pending}</span> : null}
            </Link>
            <Link href="/admin/admins">Admins</Link>
            <Link href="/admin/account">Account</Link>
            <Link href="/">View site</Link>
            <form action={signOut}>
              <button type="submit" title={admin.email ?? undefined}>
                Sign out
              </button>
            </form>
            <ReadingToggles />
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
