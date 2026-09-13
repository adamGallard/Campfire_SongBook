import { createPublicClient } from './supabase/public';
import { sanitizeBlocks } from './blocks';
import type { Item, Kind, Tag } from './types';

export interface BookData {
  items: Item[];
  kinds: Kind[];
  tags: Tag[];
}

/**
 * Everything the public book shows, or null when the database could not be
 * reached. Shared by the book and the PDF export so they can never disagree
 * about what is published.
 */
export async function loadBook(): Promise<BookData | null> {
  const supabase = createPublicClient();

  const [{ data: itemRows, error }, { data: kindRows }, { data: tagRows }] = await Promise.all([
    supabase
      .from('items')
      .select('id, slug, title, kind, tag, category_label, tune, blocks, sort_order, published, created_at, updated_at')
      .eq('published', true)
      .order('sort_order'),
    supabase.from('kinds').select('slug, label, heading, singular, plural, lede, sort_order, enabled').order('sort_order'),
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
    return null;
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

  return { items, kinds, tags };
}
