'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { parseBody, sanitizeBlocks, slugify } from '@/lib/blocks';

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

  const values = {
    title,
    kind,
    tag,
    tune: tune || null,
    category_label: categoryLabel || null,
    blocks,
    published,
  };

  if (id) {
    const { error } = await supabase.from('items').update(values).eq('id', id);
    if (error) return { error: error.message };
  } else {
    // Put a new song at the end of the running order.
    const { data: last } = await supabase
      .from('items')
      .select('sort_order')
      .eq('kind', kind)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    let slug = slugify(title);
    const { data: clash } = await supabase.from('items').select('id').eq('slug', slug).maybeSingle();
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const { error } = await supabase.from('items').insert({
      ...values,
      slug,
      sort_order: (last?.sort_order ?? 0) + 1,
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

  const { data: last } = await supabase
    .from('items')
    .select('sort_order')
    .eq('kind', kind)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  let slug = slugify(title);
  const { data: clash } = await supabase.from('items').select('id').eq('slug', slug).maybeSingle();
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const { data: song, error: songError } = await supabase
    .from('items')
    .insert({
      slug,
      title,
      kind,
      tag,
      tune: tune || null,
      category_label: categoryLabel || null,
      blocks,
      sort_order: (last?.sort_order ?? 0) + 1,
      published: true,
    })
    .select('id')
    .single();

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
    .eq('id', id);

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
    .eq('id', id);

  revalidatePath('/admin/submissions');
  redirect('/admin/submissions');
}

export async function reopenSubmission(formData: FormData) {
  const supabase = await adminClient();
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await supabase
    .from('submissions')
    .update({ status: 'pending', reviewed_by_email: null, reviewed_at: null })
    .eq('id', id);

  revalidatePath('/admin/submissions');
}

/** Add another leader to the admin allowlist. */
export async function addAdmin(_prev: ItemFormResult, formData: FormData): Promise<ItemFormResult> {
  const supabase = await adminClient();

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const note = String(formData.get('note') ?? '').trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: 'That does not look like an email address.' };
  }

  const { error } = await supabase.from('admins').insert({ email, note: note || null });
  if (error) {
    return {
      error: error.code === '23505' ? 'That address is already an admin.' : error.message,
    };
  }

  revalidatePath('/admin/admins');
  return {};
}

export async function removeAdmin(formData: FormData) {
  const supabase = await adminClient();
  const admin = await requireAdmin();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();

  // Refuse to let someone lock themselves out.
  if (!email || email === admin.email.toLowerCase()) return;

  await supabase.from('admins').delete().ilike('email', email);
  revalidatePath('/admin/admins');
}
