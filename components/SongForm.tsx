'use client';

import { useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import { Blocks } from './Blocks';
import { SubmitButton } from './ConfirmButton';
import { parseBody } from '@/lib/blocks';
import type { Song, Tag } from '@/lib/types';
import type { SongFormResult } from '@/app/admin/(dash)/actions';

type Action = (prev: SongFormResult, formData: FormData) => Promise<SongFormResult>;

export function SongForm({
  action,
  tags,
  song,
  submissionId,
  initial,
  submitLabel = 'Save song',
  extra,
}: {
  action: Action;
  tags: Tag[];
  song?: Song;
  submissionId?: string;
  initial?: { title: string; tag: string; tune: string; category_label: string; body: string };
  submitLabel?: string;
  extra?: React.ReactNode;
}) {
  const [state, formAction] = useActionState<SongFormResult, FormData>(action, {});

  const start = initial ?? {
    title: song?.title ?? '',
    tag: song?.tag ?? '',
    tune: song?.tune ?? '',
    category_label: song?.category_label ?? '',
    body: '',
  };

  const [body, setBody] = useState(start.body);
  const preview = useMemo(() => parseBody(body), [body]);

  return (
    <form className="card form" action={formAction}>
      {song ? <input type="hidden" name="id" value={song.id} /> : null}
      {submissionId ? <input type="hidden" name="id" value={submissionId} /> : null}

      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <label className="field">
        <span className="field-label">Song title</span>
        <input name="title" required maxLength={120} className="input" defaultValue={start.title} />
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field-label">Kind</span>
          <select name="tag" className="input" defaultValue={start.tag} required>
            <option value="" disabled>
              Choose one
            </option>
            {tags.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">
            Label on the card <span className="optional">optional</span>
          </span>
          <input
            name="category_label"
            maxLength={60}
            className="input"
            defaultValue={start.category_label}
            placeholder="Opener · round"
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">
          Tune line <span className="optional">optional</span>
        </span>
        <input
          name="tune"
          maxLength={200}
          className="input"
          defaultValue={start.tune}
          placeholder="Tune: traditional · faster each verse"
        />
      </label>

      <label className="field">
        <span className="field-label">The words</span>
        <textarea
          name="body"
          required
          rows={16}
          className="input textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <span className="hint">
          Blank line between verses. <code>Chorus:</code> on its own line labels the verse below it.
          <code> Note:</code> makes an aside. Lines starting <code>-</code> become a list.
          <code> **bold**</code> and <code>_italic_</code> work inside a line.
        </span>
      </label>

      {song ? (
        <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" name="published" defaultChecked={song.published} />
          <span>Show on the public songbook</span>
        </label>
      ) : (
        <input type="hidden" name="published" value="on" />
      )}

      {extra}

      <div className="preview">
        <div className="box-head">Preview</div>
        <div className="lyrics">
          {preview.length ? (
            <Blocks blocks={preview} />
          ) : (
            <p className="note">The words you type appear here as they will on the night.</p>
          )}
        </div>
      </div>

      <div className="form-actions">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={submissionId ? '/admin/submissions' : '/admin/songs'} className="linklike">
          Cancel
        </Link>
      </div>
    </form>
  );
}
