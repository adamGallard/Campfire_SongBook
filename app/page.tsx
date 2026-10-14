import { Book } from '@/components/Book';
import { OasBook } from '@/components/OasBook';
import { Hero, Footer } from '@/components/SiteChrome';
import { loadBook } from '@/lib/book';
import { brand } from '@/lib/brand';
import { loadOas } from '@/lib/oas';

// Content changes rarely; revalidate so an admin edit appears without a deploy.
// The OAS book keeps each Terrain template for a day (lib/oas.ts), so this
// only re-renders it from what it already has.
export const revalidate = 60;

export default async function HomePage() {
  if (brand.source === 'terrain') {
    // No fallback page: if Terrain cannot be read, the build fails, and a
    // background refresh keeps the last good copy.
    return <OasBook book={await loadOas()} />;
  }

  const book = await loadBook();

  if (!book) {
    return (
      <>
        <Hero title="Not just now" lede="The book could not be loaded just now." />
        <main className="wrap list">
          <p className="empty">Something went wrong reaching the book. Please try again in a moment.</p>
        </main>
        <Footer />
      </>
    );
  }

  return <Book items={book.items} kinds={book.kinds} tags={book.tags} />;
}
