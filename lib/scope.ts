import type { SupabaseClient } from '@supabase/supabase-js';
import { BOOK } from './brand';
import type { Kind } from './types';

const KIND_COLUMNS = 'slug, label, heading, singular, plural, lede, sort_order, enabled';

/**
 * This deploy's sections, in order, switched on or not. The admin pages use
 * these to show only this book's content and submissions: the two books share
 * one database and one admin list, but each site manages its own book.
 */
export async function bookKinds(supabase: SupabaseClient): Promise<Kind[]> {
  const { data } = await supabase
    .from('kinds')
    .select(KIND_COLUMNS)
    .eq('book', BOOK)
    .order('sort_order');
  return (data ?? []) as Kind[];
}

export async function bookKindSlugs(supabase: SupabaseClient): Promise<string[]> {
  return (await bookKinds(supabase)).map((k) => k.slug);
}
