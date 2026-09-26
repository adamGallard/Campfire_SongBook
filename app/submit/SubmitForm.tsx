'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Kind, Tag } from '@/lib/types';

interface Wording {
  title: string;
  tagQuestion: string;
  sub: string;
  subHint: string;
  body: string;
  bodyHint: string;
  help: React.ReactNode;
}

const PIONEERING_HELP = (
  <>
    Number the steps <code>1.</code>, <code>2.</code>, <code>3.</code>. Put <code>Kit:</code> over a
    list like <code>- 2 × Spars, 2.4 m</code>, and <code>Safety:</code> over anything to check first.
  </>
);

const SCRIPT_HELP = (
  <>
    Use <code>**Scout 1:**</code> for a speaker, <code>_(actions)_</code> in italics, and{' '}
    <code>Punchline:</code> for the line everyone yells.
  </>
);

/**
 * What each section calls things. A song has a tune and words, a skit has a
 * cast and a script; a section with no entry reads like a song.
 */
const WORDING: Record<string, Wording> = {
  song: {
    title: 'Alice The Camel',
    tagQuestion: 'What kind of song?',
    sub: 'Tune',
    subHint: 'Tune: traditional · faster each verse',
    body: 'The words',
    bodyHint: `Campfires burning, campfires burning,
Draw nearer, draw nearer,
In the glowing, in the glowing,
Come sing and be merry.

Chorus:
The words of the chorus go here.

Note: anything after "Note:" shows as a small aside.`,
    help: (
      <>
        Start a line with <code>Chorus:</code> to label one, or <code>Note:</code> for an aside.
      </>
    ),
  },
  skit: {
    title: 'Sore Finger',
    tagQuestion: 'How many scouts?',
    sub: 'Cast',
    subHint: '4 scouts — narrator, policeman…',
    body: 'The script',
    bodyHint: `**Scout 1:** Hey, you're good with first aid — I need your help.
**Scout 2:** Sure, what's the problem?
_(He presses his forehead, then his jaw, then his stomach.)_

**Scout 2:** You'd better see the doctor.

Punchline: Scout 1: He says I have a broken finger.`,
    help: SCRIPT_HELP,
  },
  yarn: {
    title: 'The Hairy Toe',
    tagQuestion: 'What sort of yarn?',
    sub: 'How to tell it',
    subHint: 'About 5 minutes · quieter and quieter to the end',
    body: 'The story',
    bodyHint: `Note: a tip for whoever is telling it.

Once, a long way from town, there lived an old woman on her own.

One evening she was out digging potatoes, when her fork hit something that was not a potato.

Punchline: YOU'VE GOT IT!`,
    help: (
      <>
        Start a paragraph with <code>Note:</code> for a tip for the teller, and{' '}
        <code>Punchline:</code> for the jump or the groan at the end.
      </>
    ),
  },
  applause: {
    title: 'Seal of Approval',
    tagQuestion: 'What sort of cheer?',
    sub: 'How to lead it',
    subHint: 'Arms straight, hands flat — flippers, not hands',
    body: 'How it goes',
    bodyHint: `Straighten both arms in front of you, palms flat.
Clap them together from the elbows, like a seal.

Punchline: Arf! Arf! Arf!

Note: tip the head back on the last one.`,
    help: SCRIPT_HELP,
  },
  knot: {
    title: 'Clove hitch',
    tagQuestion: 'What sort of knot?',
    sub: 'Also called',
    subHint: "Builder's hitch",
    body: 'How to tie it',
    bodyHint: `1. Take the end across the front of the spar and round the back.
2. Bring it up across the front, over the first turn, and round the back again.
3. Tuck the end under the diagonal, beside the standing part.
4. Pull both ends tight.

Note: what it is good for, or what to watch out for.`,
    help: PIONEERING_HELP,
  },
  lashing: {
    title: 'Square lashing',
    tagQuestion: 'What does it join?',
    sub: 'What it joins',
    subHint: 'Two spars crossing at right angles',
    body: 'How to lash it',
    bodyHint: `1. Tie a clove hitch on the upright, just under the crosspiece.
2. …

Note: how tight it should be, and how to check it.`,
    help: PIONEERING_HELP,
  },
  build: {
    title: 'A-frame',
    tagQuestion: 'What sort of build?',
    sub: 'Team and time',
    subHint: '3–4 Scouts · about 30 minutes',
    body: 'How to build it',
    bodyHint: `Kit:
- 2 × Spars, 2.4 m
- 1 × Spar, 1.8 m
- 3 × Lashing ropes, 4 m

Safety:
- Check every spar for cracks before you start.

1. Lay the two legs side by side, tips level.
2. …`,
    help: PIONEERING_HELP,
  },
  gadget: {
    title: 'Wash stand',
    tagQuestion: 'Where is it used?',
    sub: 'Team and time',
    subHint: '2 Scouts · about 20 minutes',
    body: 'How to make it',
    bodyHint: `Kit:
- 4 × Staves, 1.2 m
- 8 × Lashing ropes, 2 m

1. …`,
    help: PIONEERING_HELP,
  },
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
  const [kind, setKind] = useState(startKind || kinds[0]?.slug || '');
  const [tag, setTag] = useState('');

  const kindTags = useMemo(
    () => tags.filter((t) => t.kind === kind).sort((a, b) => a.sort_order - b.sort_order),
    [tags, kind],
  );
  const active = kinds.find((k) => k.slug === kind);
  const words = WORDING[kind] ?? WORDING[kinds[0]?.slug ?? ''] ?? WORDING.song;

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
            placeholder={words.title}
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="field-label">{words.tagQuestion}</span>
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
            {words.sub} <span className="optional">optional</span>
          </span>
          <input
            name="tune"
            maxLength={200}
            className="input"
            placeholder={words.subHint}
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">{words.body}</span>
        <textarea
          name="body"
          required
          rows={14}
          maxLength={20000}
          className="input textarea"
          placeholder={words.bodyHint}
        />
        <span className="hint">
          Leave a blank line between blocks. {words.help}
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
          {status === 'sending' ? 'Sending…' : `Send the ${active?.singular ?? 'page'} in`}
        </button>
        <Link href="/" className="linklike">
          Cancel
        </Link>
      </div>
    </form>
  );
}
