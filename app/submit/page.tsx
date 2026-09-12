import type { Metadata } from 'next';
import { Hero, Footer } from '@/components/SiteChrome';
import { createPublicClient } from '@/lib/supabase/public';
import { SubmitForm } from './SubmitForm';
import type { Tag } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Submit a song · Campfire Song Book',
  description: 'Send a campfire song in for a leader to review.',
};

export default async function SubmitPage() {
  const supabase = createPublicClient();
  const { data } = await supabase.from('tags').select('slug, label, sort_order').order('sort_order');
  const tags: Tag[] = data ?? [];

  return (
    <>
      <Hero
        title="Submit a song"
        lede="Know one that belongs round the fire? Send it in and a leader will review it before it joins the book."
      />
      <main className="wrap list">
        <SubmitForm tags={tags} />
      </main>
      <Footer />
    </>
  );
}
