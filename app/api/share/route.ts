import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BOOK } from '@/lib/brand';
import { clientIpHash } from '@/lib/ip-hash';
import { cleanPlan } from '@/lib/share';

/**
 * Store a plan and answer with its five-letter code. The checks and the rate
 * limit are in create_shared_plan, so they hold even if the database is called
 * directly; this only supplies this book and a hash of the caller's address.
 * The planner falls back to a long link when this answers with anything but a code.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Could not read that plan.' }, { status: 400 });
  }

  const plan = cleanPlan(payload.title, payload.group, payload.slugs);
  if (plan.slugs.length === 0) {
    return NextResponse.json({ error: 'There is nothing in that plan.' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc('create_shared_plan', {
    p_book: BOOK,
    p_title: plan.title,
    p_group: plan.group,
    p_slugs: plan.slugs,
    p_ip_hash: clientIpHash(request),
  });

  if (error || typeof data !== 'string') {
    if (error?.message.includes('rate_limited')) {
      return NextResponse.json(
        { error: 'That is a few in a short time. Please try again later.' },
        { status: 429 },
      );
    }
    if (error?.message.includes('invalid_plan')) {
      return NextResponse.json({ error: 'Those pages are not in the book.' }, { status: 400 });
    }
    console.error('[songbook] could not store a shared plan', error?.message);
    return NextResponse.json({ error: 'Could not save that just now.' }, { status: 500 });
  }

  return NextResponse.json({ code: data });
}
