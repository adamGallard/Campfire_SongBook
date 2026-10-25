import { Book } from '@/components/Book';
import { loadBook } from '@/lib/book';

// Content changes rarely; revalidate so an admin edit appears without a deploy.
export const revalidate = 60;

export default async function HomePage() {
  const book = await loadBook();

  // Throw rather than render an error page: a failed regeneration then keeps
  // serving the last good book, and the error is not a 200 that the service
  // worker would save over the offline copy.
  if (!book) throw new Error('The book could not be loaded.');

  return <Book items={book.items} kinds={book.kinds} tags={book.tags} />;
}
