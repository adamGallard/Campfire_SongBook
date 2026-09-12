'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'setup' | 'forgot';

const MIN_PASSWORD = 10;

export function LoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(notice ?? null);
  const [sent, setSent] = useState(false);

  function friendly(message: string): string {
    const m = message.toLowerCase();
    if (m.includes('invalid login credentials')) {
      return 'That email and password do not match. If you have never set a password, use “First time here?” below.';
    }
    if (m.includes('email not confirmed')) {
      return 'That account still needs confirming. Ask for it to be confirmed in Supabase, or use “Forgot password”.';
    }
    if (m.includes('already registered') || m.includes('already been registered')) {
      return 'That account already exists — sign in with your password, or use “Forgot password”.';
    }
    if (m.includes('rate limit') || m.includes('too many')) {
      return 'Too many attempts for the moment. Wait a little and try again.';
    }
    return message;
  }

  async function onSignIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(friendly(signInError.message));
      setBusy(false);
      return;
    }

    // The admin gate itself lives on the server; just go there.
    router.replace('/admin');
    router.refresh();
  }

  async function onSetup(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);
    const supabase = createClient();

    // Only allowlisted leaders may create an account, so a stranger cannot
    // register against the songbook at all.
    const { data: allowed, error: checkError } = await supabase.rpc('admin_email_exists', {
      p_email: email.trim(),
    });

    if (checkError) {
      setError('Could not check that address just now.');
      setBusy(false);
      return;
    }
    if (!allowed) {
      setError('That address is not on the admin list. Ask an existing admin to add it first.');
      setBusy(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setError(friendly(signUpError.message));
      setBusy(false);
      return;
    }

    // Supabase deliberately does not error when the address already exists, so
    // the sign-in below is what actually tells us whether the password took.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(
        'An account already exists for that address, so the password was not changed. ' +
          'Use “Forgot password”, or have an admin set it in Supabase.',
      );
      setBusy(false);
      return;
    }

    router.replace('/admin');
    router.refresh();
  }

  async function onForgot(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/admin/account`,
    });

    if (resetError) {
      setError(friendly(resetError.message));
      setBusy(false);
      return;
    }
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="card">
        <h2>Check your email</h2>
        <p className="lyrics">
          If <strong>{email.trim()}</strong> has an account, a reset link is on its way. Open it and
          you will be taken straight to setting a new password.
        </p>
        <p className="footlinks" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="linklike"
            onClick={() => {
              setSent(false);
              setMode('signin');
            }}
          >
            Back to sign in
          </button>
        </p>
      </div>
    );
  }

  const submit = mode === 'signin' ? onSignIn : mode === 'setup' ? onSetup : onForgot;

  return (
    <form className="card form" onSubmit={submit}>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {mode === 'setup' ? (
        <p className="form-ok">
          Setting a password for the first time. Your address must already be on the admin list.
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
          autoComplete="username"
          placeholder="you@example.com"
        />
      </label>

      {mode !== 'forgot' ? (
        <label className="field">
          <span className="field-label">Password</span>
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
            minLength={mode === 'setup' ? MIN_PASSWORD : undefined}
          />
          {mode === 'setup' ? (
            <span className="hint">At least {MIN_PASSWORD} characters.</span>
          ) : null}
        </label>
      ) : null}

      {mode === 'setup' ? (
        <label className="field">
          <span className="field-label">Confirm password</span>
          <input
            className="input"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>
      ) : null}

      <div className="form-actions">
        <button type="submit" className="primary-btn" disabled={busy}>
          {busy
            ? 'Working…'
            : mode === 'signin'
              ? 'Sign in'
              : mode === 'setup'
                ? 'Set password and sign in'
                : 'Send reset link'}
        </button>
        <Link href="/" className="linklike">
          Back to the songbook
        </Link>
      </div>

      <p className="footlinks" style={{ marginTop: 4 }}>
        {mode !== 'signin' ? (
          <button type="button" className="linklike" onClick={() => { setMode('signin'); setError(null); }}>
            Sign in instead
          </button>
        ) : (
          <>
            <button type="button" className="linklike" onClick={() => { setMode('setup'); setError(null); }}>
              First time here?
            </button>
            <button type="button" className="linklike" onClick={() => { setMode('forgot'); setError(null); }}>
              Forgot password
            </button>
          </>
        )}
      </p>
    </form>
  );
}
