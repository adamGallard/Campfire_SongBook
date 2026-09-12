'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Tag } from '@/lib/types';

const PLACEHOLDER = `Campfires burning, campfires burning,
Draw nearer, draw nearer,
In the glowing, in the glowing,
Come sing and be merry.

Chorus:
The words of the chorus go here.

Note: anything after "Note:" shows as a small aside.

- lines starting with a dash
- become a list of variations`;

export function SubmitForm({ tags }: { tags: Tag[] }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus('sending');

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setStatus('idle');
        return;
      }
      setStatus('sent');
    } catch {
      setError('Could not reach the songbook. Check your connection and try again.');
      setStatus('idle');
    }
  }

  if (status === 'sent') {
    return (
      <div className="card">
        <h2>Thanks — that is in the queue</h2>
        <p className="lyrics">
          A leader will read it over before it joins the songbook. If we need to check a line with
          you and you left an email, we will be in touch.
        </p>
        <p className="footlinks" style={{ marginTop: 20 }}>
          <Link href="/">Back to the songbook</Link>
          <button
            type="button"
            className="linklike"
            onClick={() => {
              setStatus('idle');
              setError(null);
            }}
          >
            Submit another
          </button>
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
        <span className="field-label">Song title</span>
        <input name="title" required maxLength={120} className="input" placeholder="Alice The Camel" />
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field-label">What kind of song?</span>
          <select name="tag" className="input" defaultValue="">
            <option value="">Not sure</option>
            {tags.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">
            Tune or how to sing it <span className="optional">optional</span>
          </span>
          <input
            name="tune"
            maxLength={200}
            className="input"
            placeholder="Tune: traditional · faster each verse"
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">The words</span>
        <textarea
          name="body"
          required
          rows={14}
          maxLength={8000}
          className="input textarea"
          placeholder={PLACEHOLDER}
        />
        <span className="hint">
          Leave a blank line between verses. Start a line with <code>Chorus:</code> to label one, or
          <code> Note:</code> for an aside.
        </span>
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field-label">
            Your name <span className="optional">optional</span>
          </span>
          <input name="submitter_name" maxLength={80} className="input" />
        </label>
        <label className="field">
          <span className="field-label">
            Email <span className="optional">optional</span>
          </span>
          <input
            name="submitter_email"
            type="email"
            maxLength={160}
            className="input"
            placeholder="So we can check a line with you"
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">
          Anything else for the reviewer <span className="optional">optional</span>
        </span>
        <textarea name="submitter_note" rows={3} maxLength={1000} className="input textarea" />
      </label>

      {/* Honeypot: hidden from people, catnip for bots. */}
      <div aria-hidden="true" className="honeypot">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="primary-btn" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send it in'}
        </button>
        <Link href="/" className="linklike">
          Cancel
        </Link>
      </div>
    </form>
  );
}
