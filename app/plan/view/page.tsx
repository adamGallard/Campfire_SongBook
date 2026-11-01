import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SharedPlan } from '@/components/SharedPlan';
import { loadBook } from '@/lib/book';
import { brand } from '@/lib/brand';

// The same page for every shared link, whatever the plan in its address, so it
// is built once and refreshed like the book. The plan itself is read in the browser.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'A shared plan',
  description: `A plan made with ${brand.plan.label.toLowerCase()}, to read on your phone.`,
  // Every link is a private plan for whoever was given it, not something to list.
  robots: { index: false },
};

export default async function SharedPlanPage() {
  const book = await loadBook();
  // As on the book page: keep the last good copy rather than cache an error.
  if (!book) throw new Error('The book could not be loaded.');

  return (
    // useSearchParams needs a boundary above it so the page can still be built ahead.
    <Suspense fallback={<p className="empty wrap">Opening the plan…</p>}>
      <SharedPlan items={book.items} kinds={book.kinds} tags={book.tags} />
    </Suspense>
  );
}
