'use client';

import { useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import { Blocks } from './Blocks';
import { SubmitButton } from './ConfirmButton';
import { parseBody } from '@/lib/blocks';
import type { Item, Kind, Tag } from '@/lib/types';
import type { ItemFormResult } from '@/app/admin/(dash)/actions';

type Action = (prev: ItemFormResult, formData: FormData) => Promise<ItemFormResult>;

/** What the second line and the body are actually called, per section. */
const WORDING: Record<string, { sub: string; subHint: string; body: string; pill: string }> = {
  song: {
    sub: 'Tune line',
    subHint: 'Tune: traditional · faster each verse',
    body: 'The words',
    pill: 'Opener · round',
  },
  skit: {
    sub: 'Cast line',
    subHint: '4 scouts — narrator, policeman…',
    body: 'The script',
    pill: '4–6 scouts · Chain gag',
  },
  yarn: {
    sub: 'How to tell it',
    subHint: 'About 5 minutes · quieter and quieter to the end',
    body: 'The story',
    pill: 'Spooky · jump at the end',
  },
  applause: {
    sub: 'How to lead it',
    subHint: 'Arms straight, hands flat — flippers, not hands',
    body: 'How it goes',
    pill: 'Actions · everyone',
  },
};

export function ItemForm({
  action,
  kinds,
  tags,
  item,
  submissionId,
  initial,
  submitLabel = 'Save',
  extra,
}: {
  action: Action;
  kinds: Kind[];
  tags: Tag[];
  item?: Item;
  submissionId?: string;
  initial?: {
    title: string;
    kind: string;
    tag: string;
    tune: string;
    category_label: string;
    body: string;
  };
  submitLabel?: string;
  extra?: React.ReactNode;
}) {
  const [state, formAction] = useActionState<ItemFormResult, FormData>(action, {});

  const start = initial ?? {
    title: item?.title ?? '',
    kind: item?.kind ?? kinds[0]?.slug ?? 'song',
    tag: item?.tag ?? '',
    tune: item?.tune ?? '',
    category_label: item?.category_label ?? '',
    body: '',
  };

  const [kind, setKind] = useState(start.kind || kinds[0]?.slug || 'song');
  const [tag, setTag] = useState(start.tag);
  const [body, setBody] = useState(start.body);
  const preview = useMemo(() => parseBody(body), [body]);

  // Tags belong to a kind, so changing the kind changes what can be chosen.
  const kindTags = useMemo(
    () => tags.filter((t) => t.kind === kind).sort((a, b) => a.sort_order - b.sort_order),
    [tags, kind],
  );

  const active = kinds.find((k) => k.slug === kind);
  const words = WORDING[kind] ?? WORDING.song;

  return (
    <form className="card form" action={formAction}>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      {submissionId ? <input type="hidden" name="id" value={submissionId} /> : null}

      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field-row">
        <label className="field">
          <span className="field-label">Section</span>
          <select
            name="kind"
            className="input"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setTag('');
            }}
            required
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
          <input name="title" required maxLength={120} className="input" defaultValue={start.title} />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="field-label">Kind</span>
          <select
            name="tag"
            className="input"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            required
          >
            <option value="" disabled>
              Choose one
            </option>
            {kindTags.map((t) => (
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
            maxLength={80}
            className="input"
            defaultValue={start.category_label}
            placeholder={words.pill}
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">
          {words.sub} <span className="optional">optional</span>
        </span>
        <input
          name="tune"
          maxLength={200}
          className="input"
          defaultValue={start.tune}
          placeholder={words.subHint}
        />
      </label>

      <label className="field">
        <span className="field-label">{words.body}</span>
        <textarea
          name="body"
          required
          rows={18}
          className="input textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <span className="hint">
          Blank line between blocks. <code>**Scout 1:**</code> for a speaker,{' '}
          <code>_(stage direction)_</code> in italics. <code>Punchline:</code> sets the payoff line
          large and bold. <code>Chorus:</code> labels a verse, <code>Note:</code> makes an aside,
          and lines starting <code>-</code> become a list.
        </span>
      </label>

      {item ? (
        <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" name="published" defaultChecked={item.published} />
          <span>Show on the public page</span>
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
            <p className="note">
              What you type appears here as it will on the night
              {active ? ` in ${active.label}` : ''}.
            </p>
          )}
        </div>
      </div>

      <div className="form-actions">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link
          href={submissionId ? '/admin/submissions' : `/admin/items?kind=${start.kind}`}
          className="linklike"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
