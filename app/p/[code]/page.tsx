import type { Metadata } from 'next';
import { SharedPlanView } from '@/components/SharedPlan';
import { loadBook } from '@/lib/book';
import { brand, BOOK } from '@/lib/brand';
import { createPublicClient } from '@/lib/supabase/public';
import { cleanPlan, readCode, type SharedPlan } from '@/lib/share';

export const metadata: Metadata = {
  title: 'A shared plan',
  description: `A plan made with ${brand.plan.label.toLowerCase()}, to read on your phone.`,
  // A plan is for whoever was given its code, not something to list.
  robots: { index: false },
};

/** The stored plan for a code, or null if there is none. Throws if the database cannot say. */
async function loadPlan(raw: string): Promise<SharedPlan | null> {
  const code = readCode(raw);
  if (!code) return null;

  const { data, error } = await createPublicClient().rpc('get_shared_plan', {
    p_code: code,
    p_book: BOOK,
  });
  // Throw rather than render "no such plan": an error page is not saved by the
  // service worker, but a 200 saying there is no plan would be.
  if (error) throw new Error(`Could not read a shared plan: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : null;
  return row ? cleanPlan(row.title, row.group_name, row.slugs) : null;
}

// Read on each visit, since there is one page per code. The service worker
// keeps a copy of any plan a phone has opened, so it opens again with no signal.
export default async function SharedCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [book, plan] = await Promise.all([loadBook(), loadPlan(code)]);
  if (!book) throw new Error('The book could not be loaded.');

  const shared = plan ?? { title: '', group: '', slugs: [] };

  // Only this plan's pages go to the phone, not the whole book.
  const wanted = new Set(shared.slugs);
  const items = book.items.filter((i) => wanted.has(i.slug));
  const kinds = book.kinds.filter((k) => items.some((i) => i.kind === k.slug));
  const tags = book.tags.filter((t) => kinds.some((k) => k.slug === t.kind));

  return <SharedPlanView items={items} kinds={kinds} tags={tags} plan={shared} />;
}
