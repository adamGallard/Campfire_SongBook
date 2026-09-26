import type { Metadata } from 'next';
import { Hero, Footer } from '@/components/SiteChrome';
import { createPublicClient } from '@/lib/supabase/public';
import { BOOK, brand } from '@/lib/brand';
import { SubmitForm } from './SubmitForm';
import type { Kind, Tag } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Send one in',
  description: brand.submit.description,
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const supabase = createPublicClient();
  const [{ data: kindRows }, { data: tagRows }] = await Promise.all([
    supabase
      .from('kinds')
      .select('slug, label, heading, singular, plural, lede, sort_order, enabled')
      .eq('enabled', true)
      .eq('book', BOOK)
      .order('sort_order'),
    supabase.from('tags').select('kind, slug, label, sort_order').order('sort_order'),
  ]);

  const kinds: Kind[] = kindRows ?? [];
  const tags: Tag[] = tagRows ?? [];

  // Open on whichever section they were browsing when they tapped Submit.
  const { kind } = await searchParams;
  const startKind = kinds.find((k) => k.slug === kind)?.slug ?? kinds[0]?.slug ?? '';

  return (
    <>
      <Hero
        title="Send one in"
        lede={brand.submit.lede}
      />
      <main className="wrap list">
        {kinds.length ? (
          <SubmitForm kinds={kinds} tags={tags} startKind={startKind} />
        ) : (
          <p className="empty">
            The book is not taking submissions just yet. Its first pages are still being checked.
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
