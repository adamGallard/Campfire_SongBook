import type { Metadata } from 'next';
import Link from 'next/link';
import { ExportBuilder } from '@/components/ExportBuilder';
import { Hero, Footer } from '@/components/SiteChrome';
import { loadBook } from '@/lib/book';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Make a PDF · Campfire Book',
  description:
    'Pick the songs, skits and cheers for your campfire and download them as A4 pages or a folded A5 booklet.',
};

export default async function ExportPage() {
  const book = await loadBook();

  return (
    <>
      <Hero
        title="Make a PDF"
        lede="Pick the songs, skits and cheers for your campfire, then download them as A4 pages or as a booklet to fold and staple."
        actions={
          <Link href="/" className="ghost-btn">
            Back to the book
          </Link>
        }
      />
      <main className="wrap list export-page">
        {book ? (
          <ExportBuilder items={book.items} kinds={book.kinds} tags={book.tags} />
        ) : (
          <p className="empty">Something went wrong reaching the book. Please try again in a moment.</p>
        )}
      </main>
      <Footer />
    </>
  );
}
