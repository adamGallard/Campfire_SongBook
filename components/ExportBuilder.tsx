'use client';

import { useEffect, useMemo, useState } from 'react';
import { blocksToPlainText, slugify } from '@/lib/blocks';
import { countParts } from '@/lib/kinds';
// Type-only: the PDF code itself is loaded on demand, so the page stays light.
import type { PdfFormat } from '@/lib/pdf/book-document';
import type { Item, Kind, Tag } from '@/lib/types';

const STORAGE_KEY = 'songbook:export';

interface Choices {
  selected: string[];
  format: PdfFormat;
  title: string;
  group: string;
  cover: boolean;
  newPage: boolean;
}

const DEFAULTS: Choices = {
  selected: [],
  format: 'a4',
  title: '',
  group: '',
  cover: true,
  newPage: false,
};

/** Stored choices are untrusted: keep only what still makes sense. */
function restore(raw: string, known: Set<string>): Choices {
  const saved = JSON.parse(raw) as Partial<Record<keyof Choices, unknown>>;
  return {
    selected: Array.isArray(saved.selected)
      ? saved.selected.filter((id): id is string => typeof id === 'string' && known.has(id))
      : DEFAULTS.selected,
    format: saved.format === 'booklet' ? 'booklet' : 'a4',
    title: typeof saved.title === 'string' ? saved.title : DEFAULTS.title,
    group: typeof saved.group === 'string' ? saved.group : DEFAULTS.group,
    cover: typeof saved.cover === 'boolean' ? saved.cover : DEFAULTS.cover,
    newPage: typeof saved.newPage === 'boolean' ? saved.newPage : DEFAULTS.newPage,
  };
}

/**
 * Pick items and download them as a PDF. The PDF is laid out in the browser,
 * so there is no server endpoint doing heavy work on behalf of anyone who
 * asks, and the selection never leaves the device.
 */
export function ExportBuilder({ items, kinds, tags }: { items: Item[]; kinds: Kind[]; tags: Tag[] }) {
  const [choices, setChoices] = useState<Choices>(DEFAULTS);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bring back the last selection, so a leader can close the tab and return.
  // Storage throws in some privacy modes; the page works without it.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChoices(restore(raw, new Set(items.map((i) => i.id))));
    } catch {
      /* nothing saved */
    }
  }, [items]);

  // Saved from the handlers rather than an effect, which would race the
  // restore above and overwrite it with the defaults.
  function update(patch: Partial<Choices>) {
    const next = { ...choices, ...patch };
    setChoices(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* the choice just will not persist */
    }
  }

  const selected = useMemo(() => new Set(choices.selected), [choices.selected]);
  const chosen = useMemo(() => items.filter((i) => selected.has(i.id)), [items, selected]);

  const haystacks = useMemo(
    () =>
      new Map(
        items.map((i) => [
          i.id,
          `${i.title} ${i.category_label ?? ''} ${i.tune ?? ''} ${blocksToPlainText(i.blocks)}`.toLowerCase(),
        ]),
      ),
    [items],
  );

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return kinds.map((kind) => {
      const all = items.filter((i) => i.kind === kind.slug);
      const visible = q ? all.filter((i) => (haystacks.get(i.id) ?? '').includes(q)) : all;
      return { kind, all, visible };
    });
  }, [items, kinds, query, haystacks]);

  const chosenKinds = kinds.filter((k) => chosen.some((i) => i.kind === k.slug));
  const defaultTitle =
    chosenKinds.length === 1 ? `Campfire ${chosenKinds[0].heading}` : 'Campfire Book';

  function toggle(id: string) {
    update({
      selected: selected.has(id)
        ? choices.selected.filter((s) => s !== id)
        : [...choices.selected, id],
    });
  }

  function setMany(list: Item[], on: boolean) {
    const ids = new Set(list.map((i) => i.id));
    const rest = choices.selected.filter((id) => !ids.has(id));
    update({ selected: on ? [...rest, ...ids] : rest });
  }

  function tagLabel(item: Item) {
    return (
      item.category_label ??
      tags.find((t) => t.kind === item.kind && t.slug === item.tag)?.label ??
      item.tag
    );
  }

  async function download() {
    if (chosen.length === 0 || busy) return;
    setBusy(true);
    setError(null);

    const title = choices.title.trim() || defaultTitle;
    try {
      const { buildBookPdf } = await import('@/lib/pdf/build');
      const origin = window.location.origin;
      const bytes = await buildBookPdf({
        items: chosen,
        kinds,
        tags,
        options: {
          format: choices.format,
          title,
          group: choices.group.trim(),
          cover: choices.cover,
          newPage: choices.newPage,
        },
        assets: { fontBase: `${origin}/fonts`, logo: `${origin}/scout-mark.png` },
      });

      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slugify(title) || 'campfire-book'}-${choices.format}.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      // Revoking straight away can cancel the download in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error('[songbook] PDF export failed', err);
      setError('The PDF could not be made. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const nothingMatches = sections.every((s) => s.visible.length === 0);

  return (
    <>
      <section className="card form" aria-labelledby="export-how">
        <h2 className="section-title" id="export-how">
          How it prints
        </h2>

        <fieldset className="field">
          <legend className="field-label">Format</legend>
          <div className="choice-row">
            <label className="choice">
              <input
                type="radio"
                name="format"
                checked={choices.format === 'a4'}
                onChange={() => update({ format: 'a4' })}
              />
              <span>
                <span className="choice-title">A4 pages</span>
                <span className="choice-desc">
                  Portrait pages with slightly larger type. Print them however you like.
                </span>
              </span>
            </label>
            <label className="choice">
              <input
                type="radio"
                name="format"
                checked={choices.format === 'booklet'}
                onChange={() => update({ format: 'booklet' })}
              />
              <span>
                <span className="choice-title">A5 booklet</span>
                <span className="choice-desc">
                  Two pages to each A4 sheet. Print double-sided, flipping on the short edge, then
                  fold the stack in half and staple the spine.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <div className="field-row">
          <label className="field">
            <span className="field-label">Title</span>
            <input
              className="input"
              value={choices.title}
              placeholder={defaultTitle}
              maxLength={60}
              onChange={(e) => update({ title: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">
              Group <span className="optional">(optional)</span>
            </span>
            <input
              className="input"
              value={choices.group}
              placeholder="e.g. 1st Anytown Scouts"
              maxLength={60}
              onChange={(e) => update({ group: e.target.value })}
            />
          </label>
        </div>

        <div className="checks">
          <label className="check">
            <input
              type="checkbox"
              checked={choices.cover}
              onChange={(e) => update({ cover: e.target.checked })}
            />
            Cover and contents page
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={choices.newPage}
              onChange={(e) => update({ newPage: e.target.checked })}
            />
            Start each one on a new page
          </label>
        </div>
      </section>

      <section className="card pick" aria-labelledby="export-pick">
        <h2 className="section-title" id="export-pick">
          What goes in
        </h2>
        <p className="muted-line">
          Tick as many as you like. They print in book order, and anything that fits on one page is
          kept on one page.
        </p>

        <input
          className="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a title or a line…"
          aria-label="Search the book"
        />

        {nothingMatches ? (
          <p className="empty">Nothing matches that. Try a shorter word.</p>
        ) : null}

        {sections.map(({ kind, all, visible }) =>
          visible.length === 0 ? null : (
            <div
              className="pick-section"
              key={kind.slug}
              role="group"
              aria-labelledby={`pick-${kind.slug}`}
            >
              <div className="pick-head">
                <h3 className="pick-title" id={`pick-${kind.slug}`}>
                  {kind.label}
                </h3>
                <span className="pick-count">
                  {all.filter((i) => selected.has(i.id)).length} of {all.length}
                </span>
                <span className="pick-actions">
                  <button
                    type="button"
                    className="small-btn"
                    onClick={() => setMany(visible, true)}
                    aria-label={`Tick all ${query ? 'matching ' : ''}${kind.plural}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="small-btn"
                    onClick={() => setMany(visible, false)}
                    aria-label={`Untick all ${query ? 'matching ' : ''}${kind.plural}`}
                  >
                    None
                  </button>
                </span>
              </div>
              <ul className="pick-list">
                {visible.map((item) => (
                  <li key={item.id}>
                    <label className="pick-row">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                      />
                      <span>
                        <span className="pick-name">{item.title}</span>
                        <span className="pick-meta">{tagLabel(item)}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ),
        )}
      </section>

      <div className="export-bar">
        <div className="wrap">
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <p className="export-count" aria-live="polite">
            {chosen.length === 0 ? 'Nothing ticked yet' : countParts(chosen, kinds).join(' · ')}
          </p>
          {chosen.length > 0 ? (
            <button type="button" className="linklike" onClick={() => update({ selected: [] })}>
              Clear
            </button>
          ) : null}
          <button
            type="button"
            className="primary-btn"
            disabled={chosen.length === 0 || busy}
            onClick={download}
          >
            {busy ? 'Making your PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </>
  );
}
