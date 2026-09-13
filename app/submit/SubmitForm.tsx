'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Kind, Tag } from '@/lib/types';

const PLACEHOLDERS: Record<string, string> = {
  applause: `Straighten both arms in front of you, palms flat.
Clap them together from the elbows, like a seal.

Punchline: Arf! Arf! Arf!

Note: tip the head back on the last one.`,
  song: `Campfires burning, campfires burning,
Draw nearer, draw nearer,
In the glowing, in the glowing,
Come sing and be merry.

Chorus:
The words of the chorus go here.

Note: anything after "Note:" shows as a small aside.`,
  skit: `**Scout 1:** Hey, you're good with first aid — I need your help.
**Scout 2:** Sure, what's the problem?
_(He presses his forehead, then his jaw, then his stomach.)_

**Scout 2:** You'd better see the doctor.

Punchline: Scout 1: He says I have a broken finger.`,
};

export function SubmitForm({
  kinds,
  tags,
  startKind,
}: {
  kinds: Kind[];
  tags: Tag[];
  startKind?: string;
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState(startKind ?? kinds[0]?.slug ?? 'song');
  const [tag, setTag] = useState('');

  const kindTags = useMemo(
    () => tags.filter((t) => t.kind === kind).sort((a, b) => a.sort_order - b.sort_order),
    [tags, kind],
  );
  const active = kinds.find((k) => k.slug === kind);

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
      setError('Could not reach the book. Check your connection and try again.');
      setStatus('idle');
    }
  }

  if (status === 'sent') {
    return (
      <div className="card">
        <h2>Thanks — that is in the queue</h2>
        <p className="lyrics">
          A leader will read it over before it joins the book. If we need to check a line with you
          and you left an email, we will be in touch.
        </p>
        <p className="footlinks" style={{ marginTop: 20 }}>
          <Link href="/">Back to the book</Link>
          <button
            type="button"
            className="linklike"
            onClick={() => {
              setStatus('idle');
              setError(null);
            }}
          >
            Send another
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

      <div className="field-row">
        <label className="field">
          <span className="field-label">What is it?</span>
          <select
            name="kind"
            className="input"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              // Tags belong to a kind, so a leftover "Loud" would be invalid.
              setTag('');
            }}
          >
            {kinds.map((k) => (
              <option key={k.slug} value={k.slug}>
                {k.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Title</span>
          <input
            name="title"
            required
            maxLength={120}
            className="input"
            placeholder={
              kind === 'skit' ? 'Sore Finger' : kind === 'applause' ? 'Seal of Approval' : 'Alice The Camel'
            }
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="field-label">
            {kind === 'skit' ? 'How many scouts?' : kind === 'applause' ? 'What sort of cheer?' : 'What kind of song?'}
          </span>
          <select
            name="tag"
            className="input"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="">Not sure</option>
            {kindTags.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">
            {kind === 'skit' ? 'Cast' : kind === 'applause' ? 'How to lead it' : 'Tune'}{' '}
            <span className="optional">optional</span>
          </span>
          <input
            name="tune"
            maxLength={200}
            className="input"
            placeholder={
              kind === 'skit'
                ? '4 scouts — narrator, policeman…'
                : kind === 'applause'
                  ? 'Arms straight, hands flat — flippers, not hands'
                  : 'Tune: traditional · faster each verse'
            }
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">
          {kind === 'skit' ? 'The script' : kind === 'applause' ? 'How it goes' : 'The words'}
        </span>
        <textarea
          name="body"
          required
          rows={14}
          maxLength={8000}
          className="input textarea"
          placeholder={PLACEHOLDERS[kind] ?? PLACEHOLDERS.song}
        />
        <span className="hint">
          Leave a blank line between blocks.{' '}
          {kind === 'skit' || kind === 'applause' ? (
            <>
              Use <code>**Scout 1:**</code> for a speaker, <code>_(actions)_</code> in italics, and{' '}
              <code>Punchline:</code> for the line everyone yells.
            </>
          ) : (
            <>
              Start a line with <code>Chorus:</code> to label one, or <code>Note:</code> for an
              aside.
            </>
          )}
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
          {status === 'sending' ? 'Sending…' : `Send the ${active?.singular ?? 'song'} in`}
        </button>
        <Link href="/" className="linklike">
          Cancel
        </Link>
      </div>
    </form>
  );
}
