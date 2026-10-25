'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, requireAllBooksAdmin } from '@/lib/auth';
import { isBookSlug, type BookSlug } from '@/lib/brand';
import { parseBody, sanitizeBlocks, slugify } from '@/lib/blocks';
import { cleanWatchUrl } from '@/lib/watch';

/**
 * Every action re-checks the admin. RLS on the database would refuse these
 * writes anyway, but failing early gives a sensible error instead of a silent
 * empty result.
 */
async function adminClient() {
  await requireAdmin();
  return createClient();
}

function refreshPublic() {
  revalidatePath('/');
  revalidatePath('/admin/items');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

export interface ItemFormResult {
  error?: string;
  /** From addAdmin: the new admin's one-time setup code, shown once. */
  setupCode?: string;
}

/**
 * The fields only some books' forms carry: age and group sizes on Games, the
 * animation link on Pioneering. A form without them leaves them alone, so a
 * Campfire save never clears them. Returns a string when a value makes no sense.
 */
function bookFields(formData: FormData): Record<string, unknown> | string {
  const values: Record<string, unknown> = {};

  if (formData.get('group_sizes_present') !== null) {
    const age = String(formData.get('age') ?? '');
    values.age = ['cubs', 'scouts', 'both'].includes(age) ? age : null;
    const sizes = formData
      .getAll('group_sizes')
      .map(String)
      .filter((v) => ['small', 'patrol', 'large'].includes(v));
    values.group_sizes = sizes.length ? sizes : null;
  }

  const watch = formData.get('watch_url');
  if (watch !== null) {
    try {
      values.watch_url = cleanWatchUrl(String(watch));
    } catch (e) {
      return (e as Error).message;
    }
  }

  return values;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** The next free place at the end of a section's running order. */
async function nextSortOrder(supabase: Supabase, kind: string): Promise<number> {
  const { data: last } = await supabase
    .from('items')
    .select('sort_order')
    .eq('kind', kind)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (last?.sort_order ?? 0) + 1;
}

/**
 * Insert a new item under a slug made from its title. Slugs are unique across
 * every book, but a book admin cannot see the other books' hidden items, so a
 * clash only shows up as a failed insert: then try once more with a suffix.
 */
async function insertItem(supabase: Supabase, title: string, values: Record<string, unknown>) {
  const slug = slugify(title);
  const attempt = (s: string) =>
    supabase.from('items').insert({ ...values, slug: s }).select('id').single();
  const first = await attempt(slug);
  if (first.error?.code !== '23505') return first;
  return attempt(`${slug}-${Date.now().toString(36).slice(-4)}`);
}

export async function saveItem(
  _prev: ItemFormResult,
  formData: FormData,
): Promise<ItemFormResult> {
  const supabase = await adminClient();

  const id = String(formData.get('id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const kind = String(formData.get('kind') ?? '').trim();
  const tag = String(formData.get('tag') ?? '').trim();
  const tune = String(formData.get('tune') ?? '').trim();
  const categoryLabel = String(formData.get('category_label') ?? '').trim();
  const body = String(formData.get('body') ?? '');
  const published = formData.get('published') === 'on';

  if (!title) return { error: 'Give it a title.' };
  if (!kind) return { error: 'Choose a section.' };
  if (!tag) return { error: 'Choose what kind it is.' };

  const blocks = sanitizeBlocks(parseBody(body));
  if (!blocks.length) return { error: 'It needs some words.' };

  const extras = bookFields(formData);
  if (typeof extras === 'string') return { error: extras };

  const values: Record<string, unknown> = {
    title,
    kind,
    tag,
    tune: tune || null,
    category_label: categoryLabel || null,
    blocks,
    published,
    ...extras,
  };

  if (id) {
    // Moved to another section: go to the end of it, as a new item would, so
    // its old place in the running order cannot tie with one already there.
    const { data: current } = await supabase.from('items').select('kind').eq('id', id).maybeSingle();
    if (current && current.kind !== kind) values.sort_order = await nextSortOrder(supabase, kind);

    const { error } = await supabase.from('items').update(values).eq('id', id);
    if (error) return { error: error.message };
  } else {
    // Put a new song at the end of the running order.
    const { error } = await insertItem(supabase, title, {
      ...values,
      sort_order: await nextSortOrder(supabase, kind),
    });
    if (error) return { error: error.message };
  }

  refreshPublic();
  redirect(`/admin/items?kind=${encodeURIComponent(kind)}`);
}

export async function deleteItem(formData: FormData) {
  const supabase = await adminClient();
  const id = String(formData.get('id') ?? '');
  if (id) await supabase.from('items').delete().eq('id', id);
  refreshPublic();
}

export async function togglePublished(formData: FormData) {
  const supabase = await adminClient();
  const id = String(formData.get('id') ?? '');
  const next = formData.get('published') === '1';
  if (id) await supabase.from('items').update({ published: next }).eq('id', id);
  refreshPublic();
}

/** Swap an item with its neighbour so leaders can set the running order. */
export async function moveItem(formData: FormData) {
  const supabase = await adminClient();
  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || (direction !== 'up' && direction !== 'down')) return;

  const { data: current } = await supabase
    .from('items')
    .select('id, sort_order, kind')
    .eq('id', id)
    .maybeSingle();
  if (!current) return;

  // Swap only within the same section, so moving a skit never reshuffles songs.
  const base = supabase
    .from('items')
    .select('id, sort_order')
    .eq('kind', current.kind)
    .limit(1);
  const { data: neighbour } =
    direction === 'down'
      ? await base.gt('sort_order', current.sort_order).order('sort_order', { ascending: true }).maybeSingle()
      : await base.lt('sort_order', current.sort_order).order('sort_order', { ascending: false }).maybeSingle();
  if (!neighbour) return;

  await supabase.from('items').update({ sort_order: neighbour.sort_order }).eq('id', current.id);
  await supabase.from('items').update({ sort_order: current.sort_order }).eq('id', neighbour.id);

  refreshPublic();
}

export async function approveSubmission(
  _prev: ItemFormResult,
  formData: FormData,
): Promise<ItemFormResult> {
  const supabase = await adminClient();
  const admin = await requireAdmin();

  const id = String(formData.get('id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const kind = String(formData.get('kind') ?? '').trim();
  const tag = String(formData.get('tag') ?? '').trim();
  const tune = String(formData.get('tune') ?? '').trim();
  const categoryLabel = String(formData.get('category_label') ?? '').trim();
  const body = String(formData.get('body') ?? '');
  const reviewNote = String(formData.get('review_note') ?? '').trim();

  if (!id) return { error: 'Missing submission.' };
  if (!title) return { error: 'Give it a title.' };
  if (!kind) return { error: 'Choose a section.' };
  if (!tag) return { error: 'Choose what kind it is.' };

  const blocks = sanitizeBlocks(parseBody(body));
  if (!blocks.length) return { error: 'It needs some words.' };

  // The review form is the same ItemForm, so it carries the same book fields.
  const extras = bookFields(formData);
  if (typeof extras === 'string') return { error: extras };

  // Only once: approving again would publish a second copy.
  const { data: submission } = await supabase
    .from('submissions')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (submission?.status !== 'pending') return { error: 'This one has already been reviewed.' };

  const { data: song, error: songError } = await insertItem(supabase, title, {
    title,
    kind,
    tag,
    tune: tune || null,
    category_label: categoryLabel || null,
    blocks,
    ...extras,
    sort_order: await nextSortOrder(supabase, kind),
    published: true,
  });

  if (songError) return { error: songError.message };

  const { error: subError } = await supabase
    .from('submissions')
    .update({
      status: 'approved',
      review_note: reviewNote || null,
      reviewed_by_email: admin.email,
      reviewed_at: new Date().toISOString(),
      published_song_id: song.id,
    })
    .eq('id', id)
    .eq('status', 'pending');

  if (subError) return { error: subError.message };

  refreshPublic();
  revalidatePath('/admin/submissions');
  redirect('/admin/submissions');
}

export async function rejectSubmission(formData: FormData) {
  const supabase = await adminClient();
  const admin = await requireAdmin();

  const id = String(formData.get('id') ?? '');
  const reviewNote = String(formData.get('review_note') ?? '').trim();
  if (!id) return;

  await supabase
    .from('submissions')
    .update({
      status: 'rejected',
      review_note: reviewNote || null,
      reviewed_by_email: admin.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending');

  revalidatePath('/admin/submissions');
  redirect('/admin/submissions');
}

/**
 * Put a declined submission back in the queue. An approved one stays approved:
 * its item is already published, so hide or delete that item instead.
 */
export async function reopenSubmission(formData: FormData) {
  const supabase = await adminClient();
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await supabase
    .from('submissions')
    .update({ status: 'pending', reviewed_by_email: null, reviewed_at: null })
    .eq('id', id)
    .eq('status', 'rejected');

  revalidatePath('/admin/submissions');
}

/**
 * The books a form gave an admin: null for every book, or the ticked ones.
 * Returns a string when the choice makes no sense.
 */
function chosenBooks(formData: FormData): BookSlug[] | null | string {
  if (formData.get('all_books') === 'on') return null;
  const books = formData.getAll('books').map(String).filter(isBookSlug);
  if (!books.length) return 'Tick at least one book, or All books.';
  return [...new Set(books)];
}

function refreshAdmins() {
  revalidatePath('/admin/admins');
  revalidatePath('/admin/all');
}

/** Add another leader to the admin allowlist, for some books or all of them. */
export async function addAdmin(_prev: ItemFormResult, formData: FormData): Promise<ItemFormResult> {
  await requireAllBooksAdmin();
  const supabase = await createClient();

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const note = String(formData.get('note') ?? '').trim();
  const books = chosenBooks(formData);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: 'That does not look like an email address.' };
  }
  if (typeof books === 'string') return { error: books };

  // They need this to create their account; only its hash is kept, so it is
  // shown once, here. See guard_new_user in supabase/schema.sql.
  const setupCode = randomBytes(9).toString('base64url');
  const setupHash = createHash('sha256').update(setupCode).digest('hex');

  const { error } = await supabase
    .from('admins')
    .insert({ email, note: note || null, books, setup_hash: setupHash });
  if (error) {
    return {
      error: error.code === '23505' ? 'That address is already an admin.' : error.message,
    };
  }

  refreshAdmins();
  return { setupCode };
}

/** Change which books an admin looks after. */
export async function setAdminBooks(
  _prev: ItemFormResult,
  formData: FormData,
): Promise<ItemFormResult> {
  const me = await requireAllBooksAdmin();
  const supabase = await createClient();

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const books = chosenBooks(formData);
  if (!email) return { error: 'Missing address.' };
  if (typeof books === 'string') return { error: books };

  // Narrowing your own access would lock you out of this page.
  if (email === me.email.toLowerCase()) return { error: 'You cannot change your own access.' };

  const { error } = await supabase.from('admins').update({ books }).eq('email', email);
  if (error) return { error: error.message };

  refreshAdmins();
  return {};
}

export async function removeAdmin(formData: FormData) {
  const admin = await requireAllBooksAdmin();
  const supabase = await createClient();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();

  // Refuse to let someone lock themselves out.
  if (!email || email === admin.email.toLowerCase()) return;

  await supabase.from('admins').delete().eq('email', email);
  refreshAdmins();
}

/**
 * Switch a section on or off, in any book. This site's pages refresh now;
 * the other books' sites pick it up within a minute (they revalidate every 60s).
 */
export async function setSectionEnabled(formData: FormData) {
  await requireAllBooksAdmin();
  const supabase = await createClient();
  const slug = String(formData.get('slug') ?? '');
  const enabled = formData.get('enabled') === '1';
  if (!slug) return;

  await supabase.from('kinds').update({ enabled }).eq('slug', slug);
  revalidatePath('/');
  revalidatePath('/plan');
  revalidatePath('/submit');
  revalidatePath('/admin/all');
}
