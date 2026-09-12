import { redirect } from 'next/navigation';
import { Hero, Footer } from '@/components/SiteChrome';
import { getAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '../(dash)/actions';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Admin sign in · Campfire Song Book' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAdmin()) redirect('/admin');

  const { error } = await searchParams;

  // Signed in, but not on the allowlist. Say so plainly rather than bouncing
  // them back to an empty form with no explanation.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <>
        <Hero title="Not an admin" lede="You are signed in, but this address cannot manage the songbook." />
        <main className="wrap list">
          <div className="card">
            <h2>Signed in as {user.email}</h2>
            <p className="lyrics">
              That address is not on the songbook admin list. Ask an existing admin to add it, then
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
      <Hero title="Admin sign in" lede="For leaders who look after the songbook." />
      <main className="wrap list">
        <LoginForm
          notice={
            error === 'link'
              ? 'That link has expired. Sign in with your password below.'
              : undefined
          }
        />
      </main>
      <Footer />
    </>
  );
}
