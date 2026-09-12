import { Book } from '@/components/Book';
import { Hero, Footer } from '@/components/SiteChrome';
import { createPublicClient } from '@/lib/supabase/public';
import { sanitizeBlocks } from '@/lib/blocks';
import type { Item, Kind, Tag } from '@/lib/types';

// Content changes rarely; revalidate so an admin edit appears without a deploy.
export const revalidate = 60;

export default async function HomePage() {
  const supabase = createPublicClient();

  const [{ data: itemRows, error }, { data: kindRows }, { data: tagRows }] = await Promise.all([
    supabase
      .from('items')
      .select('id, slug, title, kind, tag, category_label, tune, blocks, sort_order, published, created_at, updated_at')
      .eq('published', true)
      .order('sort_order'),
    supabase.from('kinds').select('slug, label, singular, lede, sort_order, enabled').order('sort_order'),
    supabase.from('tags').select('kind, slug, label, sort_order').order('sort_order'),
  ]);

  if (error) {
    // Log it: without this the page degrades silently and a misconfigured
    // deploy looks identical to an empty book.
    console.error('[songbook] could not load items', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 12),
    });

    return (
      <>
        <Hero title={<>Campfire<br />Book</>} lede="The book could not be loaded just now." />
        <main className="wrap list">
          <p className="empty">Something went wrong reaching the book. Please try again in a moment.</p>
        </main>
        <Footer />
      </>
    );
  }

  const items: Item[] = (itemRows ?? []).map((row) => ({
    ...row,
    blocks: sanitizeBlocks(row.blocks),
  })) as Item[];

  // Only show a section that is switched on and actually has something in it.
  const kinds: Kind[] = (kindRows ?? []).filter(
    (k: Kind) => k.enabled && items.some((i) => i.kind === k.slug),
  );
  const tags: Tag[] = tagRows ?? [];

  return <Book items={items} kinds={kinds} tags={tags} />;
}
