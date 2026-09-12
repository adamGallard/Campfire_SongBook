import Link from 'next/link';
import { Songbook } from '@/components/Songbook';
import { ReadingToggles } from '@/components/ReadingPrefs';
import { Hero, Footer } from '@/components/SiteChrome';
import { createPublicClient } from '@/lib/supabase/public';
import { sanitizeBlocks } from '@/lib/blocks';
import type { Song, Tag } from '@/lib/types';

// Songs change rarely; revalidate so an admin edit appears without a redeploy.
export const revalidate = 60;

export default async function HomePage() {
  const supabase = createPublicClient();

  const [{ data: songRows, error: songError }, { data: tagRows }] = await Promise.all([
    supabase
      .from('songs')
      .select('id, slug, title, tag, category_label, tune, blocks, sort_order, published, created_at, updated_at')
      .eq('published', true)
      .order('sort_order'),
    supabase.from('tags').select('slug, label, sort_order').order('sort_order'),
  ]);

  if (songError) {
    return (
      <>
        <Hero title={<>Campfire<br />Song Book</>} lede="The songbook could not be loaded just now." />
        <main className="wrap list">
          <p className="empty">
            Something went wrong reaching the songbook. Please try again in a moment.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  const songs: Song[] = (songRows ?? []).map((row) => ({
    ...row,
    blocks: sanitizeBlocks(row.blocks),
  })) as Song[];

  const tags: Tag[] = tagRows ?? [];

  return (
    <>
      <Hero
        title={
          <>
            Campfire
            <br />
            Song Book
          </>
        }
        lede={`${songs.length} songs for the fire. Search for one, or scroll from the loud ones at the top to the quiet ones at the end.`}
        actions={
          <>
            <ReadingToggles />
            <Link href="/submit" className="ghost-btn">
              Submit a song
            </Link>
          </>
        }
      />
      <Songbook songs={songs} tags={tags} />
      <Footer songCount={songs.length} />
    </>
  );
}
