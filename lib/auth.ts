import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

/**
 * Resolve the signed-in admin, or null.
 *
 * Admin-ness is decided by the `admins` allowlist in the database, matched on
 * the verified email in the session — never by anything the browser sends.
 */
export async function getAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data } = await supabase
    .from('admins')
    .select('email')
    .ilike('email', user.email)
    .maybeSingle();

  return data ? { id: user.id, email: user.email } : null;
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
