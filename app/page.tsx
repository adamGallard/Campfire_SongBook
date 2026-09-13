import { Book } from '@/components/Book';
import { Hero, Footer } from '@/components/SiteChrome';
import { loadBook } from '@/lib/book';

// Content changes rarely; revalidate so an admin edit appears without a deploy.
export const revalidate = 60;

export default async function HomePage() {
  const book = await loadBook();

  if (!book) {
    return (
      <>
        <Hero title={<>Campfire<br />Book</>} lede="The book could not be loaded just now." />
        <main className="wrap list">
          <p className="empty">Something went wrong reaching the book. Please try again in a moment.</p>
        </main>
        <Footer />
      </>
    );
  }

  return <Book items={book.items} kinds={book.kinds} tags={book.tags} />;
}
