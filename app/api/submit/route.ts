import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const LIMITS = {
  title: 120,
  tune: 200,
  body: 8000,
  name: 80,
  email: 160,
  note: 1000,
} as const;

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * Salted hash of the caller's IP: enough to rate-limit, not an address on file.
 * The limit itself is enforced inside submit_song, so it holds even if someone
 * calls the database directly.
 */
function clientIpHash(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for') ?? '';
  const ip = fwd.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
  const salt = process.env.SUBMISSION_SALT ?? 'campfire';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Could not read that submission.' }, { status: 400 });
  }

  // Honeypot: a real person never fills this in, bots usually do. Answer as if
  // it worked so there is nothing to tune against.
  if (str(payload.website, 200)) {
    return NextResponse.json({ ok: true });
  }

  const title = str(payload.title, LIMITS.title);
  const body = str(payload.body, LIMITS.body);
  const submitterEmail = str(payload.submitter_email, LIMITS.email);

  if (!title) {
    return NextResponse.json({ error: 'Please give the song a title.' }, { status: 400 });
  }
  if (body.length < 20) {
    return NextResponse.json(
      { error: 'Please include the words — at least a verse or two.' },
      { status: 400 },
    );
  }
  if (submitterEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(submitterEmail)) {
    return NextResponse.json({ error: 'That email address does not look right.' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { error } = await supabase.rpc('submit_song', {
    p_title: title,
    p_tag: str(payload.tag, 40) || null,
    p_tune: str(payload.tune, LIMITS.tune) || null,
    p_body: body,
    p_name: str(payload.submitter_name, LIMITS.name) || null,
    p_email: submitterEmail || null,
    p_note: str(payload.submitter_note, LIMITS.note) || null,
    p_ip_hash: clientIpHash(request),
    p_kind: str(payload.kind, 40) || 'song',
  });

  if (error) {
    if (error.message.includes('rate_limited')) {
      return NextResponse.json(
        { error: 'That is a few songs in a short time — please try again later.' },
        { status: 429 },
      );
    }
    if (error.message.includes('invalid_title') || error.message.includes('invalid_body')) {
      return NextResponse.json({ error: 'Please check the title and the words.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Could not save that just now.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
