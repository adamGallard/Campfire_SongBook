import { redirect } from 'next/navigation';
import { BOOK, type BookSlug } from './brand';
import { createClient } from './supabase/server';

export interface Admin {
  id: string;
  email: string;
  /** The books this admin looks after; null means every book. */
  books: BookSlug[] | null;
  /** Looks after every book, so can manage admins and see the All books page. */
  allBooks: boolean;
}

/**
 * The signed-in user's row on the admin allowlist, whichever books it covers,
 * or null.
 *
 * Admin-ness is decided by the `admins` allowlist in the database, matched on
 * the verified email in the session — never by anything the browser sends.
 */
export async function getAdminRecord(): Promise<Admin | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data } = await supabase
    .from('admins')
    .select('email, books')
    .ilike('email', user.email)
    .maybeSingle();
  if (!data) return null;

  const books = (data.books as BookSlug[] | null) ?? null;
  return { id: user.id, email: user.email, books, allBooks: books === null };
}

/** The signed-in admin, if they look after this deploy's book; otherwise null. */
export async function getAdmin(): Promise<Admin | null> {
  const admin = await getAdminRecord();
  if (!admin) return null;
  if (admin.books && !admin.books.includes(BOOK)) return null;
  return admin;
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}

/** An admin who looks after every book; anyone else goes back to the overview. */
export async function requireAllBooksAdmin() {
  const admin = await requireAdmin();
  if (!admin.allBooks) redirect('/admin');
  return admin;
}
