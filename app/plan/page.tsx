import type { Metadata } from 'next';
import Link from 'next/link';
import { ExportBuilder } from '@/components/ExportBuilder';
import { Hero, Footer } from '@/components/SiteChrome';
import { loadBook } from '@/lib/book';
import { brand } from '@/lib/brand';

export const revalidate = 60;

export const metadata: Metadata = {
  title: brand.plan.label,
  description: brand.plan.description,
};

export default async function PlanPage() {
  const book = await loadBook();
  // As on the book page: keep the last good planner rather than cache an error.
  if (!book) throw new Error('The book could not be loaded.');

  return (
    <>
      <Hero
        title={brand.plan.label}
        lede={brand.plan.lede}
        actions={
          <Link href="/" className="ghost-btn">
            Back to the book
          </Link>
        }
      />
      <main className="wrap list export-page">
        <ExportBuilder items={book.items} kinds={book.kinds} tags={book.tags} />
      </main>
      <Footer />
    </>
  );
}
