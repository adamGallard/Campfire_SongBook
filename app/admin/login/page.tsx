import { redirect } from 'next/navigation';
import { Hero, Footer } from '@/components/SiteChrome';
import { getAdmin } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Admin sign in · Campfire Song Book' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAdmin()) redirect('/admin');
  const { error } = await searchParams;

  return (
    <>
      <Hero title="Admin sign in" lede="For leaders who look after the songbook." />
      <main className="wrap list">
        <LoginForm linkError={error === 'link'} />
      </main>
      <Footer />
    </>
  );
}
