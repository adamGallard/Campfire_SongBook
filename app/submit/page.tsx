import type { Metadata } from 'next';
import { Hero, Footer } from '@/components/SiteChrome';
import { createPublicClient } from '@/lib/supabase/public';
import { SubmitForm } from './SubmitForm';
import type { Kind, Tag } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Send one in',
  description: 'Send a campfire song, skit, yarn or cheer in for a leader to review.',
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
      .order('sort_order'),
    supabase.from('tags').select('kind, slug, label, sort_order').order('sort_order'),
  ]);

  const kinds: Kind[] = kindRows ?? [];
  const tags: Tag[] = tagRows ?? [];

  // Open on whichever section they were browsing when they tapped Submit.
  const { kind } = await searchParams;
  const startKind = kinds.find((k) => k.slug === kind)?.slug ?? kinds[0]?.slug ?? 'song';

  return (
    <>
      <Hero
        title="Send one in"
        lede="Know a song, a skit, a yarn or a cheer that belongs round the fire? Send it in and a leader will review it before it joins the book."
      />
      <main className="wrap list">
        <SubmitForm kinds={kinds} tags={tags} startKind={startKind} />
      </main>
      <Footer />
    </>
  );
}
