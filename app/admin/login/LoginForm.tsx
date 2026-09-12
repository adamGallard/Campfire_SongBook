'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function LoginForm({ linkError }: { linkError: boolean }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(
    linkError ? 'That sign-in link has expired. Request a new one.' : null,
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus('sending');

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signInError) {
      setError(signInError.message);
      setStatus('idle');
      return;
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div className="card">
        <h2>Check your email</h2>
        <p className="lyrics">
          If <strong>{email.trim()}</strong> is on the admin list, a sign-in link is on its way.
          Open it on this device.
        </p>
        <p className="footlinks" style={{ marginTop: 20 }}>
          <Link href="/">Back to the songbook</Link>
        </p>
      </div>
    );
  }

  return (
    <form className="card form" onSubmit={onSubmit}>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <label className="field">
        <span className="field-label">Email address</span>
        <input
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <span className="hint">
          We send a one-time sign-in link — there is no password to remember.
        </span>
      </label>

      <div className="form-actions">
        <button type="submit" className="primary-btn" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
        </button>
        <Link href="/" className="linklike">
          Back to the songbook
        </Link>
      </div>
    </form>
  );
}
