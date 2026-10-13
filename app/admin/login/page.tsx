import { redirect } from 'next/navigation';
import { Hero, Footer } from '@/components/SiteChrome';
import { getAdmin, getAdminRecord } from '@/lib/auth';
import { brand, brandFor } from '@/lib/brand';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '../(dash)/actions';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Admin sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  if (await getAdmin()) redirect('/admin');

  const { error, reason } = await searchParams;

  // Signed in, but not on the allowlist. Say so plainly rather than bouncing
  // them back to an empty form with no explanation.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // On the list, but for other books: point them at those.
  const record = user ? await getAdminRecord() : null;
  if (record?.books) {
    const theirs = record.books.map(brandFor);
    return (
      <>
        <Hero
          title={`Not a ${brand.name} admin`}
          lede="You look after a different book."
        />
        <main className="wrap list">
          <div className="card">
            <h2>Signed in as {record.email}</h2>
            <p className="lyrics">
              That address can manage {theirs.map((b) => b.name).join(' and ')}, not{' '}
              {brand.name}. Ask an admin for every book if you need {brand.name} too.
            </p>
            <div className="row-actions" style={{ marginTop: 20 }}>
              {theirs.map((b) => (
                <a key={b.slug} href={`${b.url}/admin`} className="small-btn">
                  {b.name} admin
                </a>
              ))}
              <form action={signOut}>
                <button type="submit" className="small-btn">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (user) {
    return (
      <>
        <Hero title="Not an admin" lede="You are signed in, but this address cannot manage the book." />
        <main className="wrap list">
          <div className="card">
            <h2>Signed in as {user.email}</h2>
            <p className="lyrics">
              That address is not on the admin list. Ask an existing admin to add it, then
              sign in again.
            </p>
            <form action={signOut} className="form-actions" style={{ marginTop: 20 }}>
              <button type="submit" className="primary-btn">
                Sign out
              </button>
            </form>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Hero title="Admin sign in" lede="For leaders who look after the book." />
      <main className="wrap list">
        <LoginForm
          notice={
            reason ??
            (error === 'link'
              ? 'That link has expired. Sign in with your password below.'
              : undefined)
          }
        />
      </main>
      <Footer />
    </>
  );
}
