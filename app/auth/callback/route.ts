import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Completes a Supabase email link (currently only password recovery) by
 * exchanging the code for a session cookie.
 *
 * The PKCE verifier lives in a cookie set when the link was requested, so the
 * link must be opened in the same browser that asked for it.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/admin';

  // Supabase reports its own failures here (expired link, redirect not
  // allowlisted). Pass the reason through rather than inventing one.
  const supabaseError = searchParams.get('error_description') ?? searchParams.get('error');
  if (supabaseError) {
    return NextResponse.redirect(
      `${origin}/admin/login?reason=${encodeURIComponent(supabaseError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/admin/login?reason=${encodeURIComponent(
        'That link did not carry a sign-in code. Request a new one.',
      )}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/admin/login?reason=${encodeURIComponent(
        `${error.message}. If you opened the link in a different browser, request a new one and open it in the same one.`,
      )}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
