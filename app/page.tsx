import { Book } from '@/components/Book';
import { OasBook } from '@/components/OasBook';
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

  // Throw rather than render an error page: a failed regeneration then keeps
  // serving the last good book, and the error is not a 200 that the service
  // worker would save over the offline copy.
  if (!book) throw new Error('The book could not be loaded.');

  return <Book items={book.items} kinds={book.kinds} tags={book.tags} />;
}
