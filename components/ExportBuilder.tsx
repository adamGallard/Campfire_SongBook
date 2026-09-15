'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { blocksToPlainText, slugify } from '@/lib/blocks';
import { countParts, inBookOrder, sectionsTogether } from '@/lib/kinds';
// Type-only: the PDF code itself is loaded on demand, so the page stays light.
import type { PdfFormat } from '@/lib/pdf/book-document';
import type { Item, Kind, Tag } from '@/lib/types';

const STORAGE_KEY = 'songbook:export';
/** Sections folded away on this device: "how" for the print options, or a section's slug. */
const FOLDED_KEY = 'songbook:plan-folded';

/** Book order, or an order the leader has arranged by hand. */
type Order = 'book' | 'mine';

interface Choices {
  /** Ticked item ids. In `mine` order, this is also the running order. */
  selected: string[];
  order: Order;
  format: PdfFormat;
  title: string;
  group: string;
  cover: boolean;
  newPage: boolean;
}

const DEFAULTS: Choices = {
  selected: [],
  order: 'book',
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
      ? [
          ...new Set(
            saved.selected.filter((id): id is string => typeof id === 'string' && known.has(id)),
          ),
        ]
      : DEFAULTS.selected,
    order: saved.order === 'mine' ? 'mine' : 'book',
    format: saved.format === 'booklet' ? 'booklet' : 'a4',
    title: typeof saved.title === 'string' ? saved.title : DEFAULTS.title,
    group: typeof saved.group === 'string' ? saved.group : DEFAULTS.group,
    cover: typeof saved.cover === 'boolean' ? saved.cover : DEFAULTS.cover,
    newPage: typeof saved.newPage === 'boolean' ? saved.newPage : DEFAULTS.newPage,
  };
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "a, b or c" */
function either(words: string[]) {
  return words.length < 2
    ? (words[0] ?? '')
    : `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`;
}

/** The title of a section that folds away, with a chevron that says which way it is. */
function Fold({
  open,
  controls,
  onToggle,
  children,
}: {
  open: boolean;
  controls: string;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="fold-btn"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
    >
      <svg viewBox="0 0 16 16" className="fold-chevron" aria-hidden="true">
        <path d="M4 6l4 4 4-4" />
      </svg>
      {children}
    </button>
  );
}

/**
 * Pick items, put them in order and download them as a PDF. The PDF is laid
 * out in the browser, so there is no server endpoint doing heavy work on
 * behalf of anyone who asks, and the selection never leaves the device.
 */
export function ExportBuilder({ items, kinds, tags }: { items: Item[]; kinds: Kind[]; tags: Tag[] }) {
  const [choices, setChoices] = useState<Choices>(DEFAULTS);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [folded, setFolded] = useState<Set<string>>(() => new Set());
  /** The row being dragged, and the gap it would drop into (0 is the top). */
  const [drag, setDrag] = useState<{ id: string; gap: number } | null>(null);
  /** A selector to focus once a move or removal has re-rendered the list. */
  const focusAfter = useRef<string | null>(null);

  // Only sections the book is showing, even from an older saved selection.
  const pickable = useMemo(
    () => items.filter((i) => kinds.some((k) => k.slug === i.kind)),
    [items, kinds],
  );
  const byId = useMemo(() => new Map(pickable.map((i) => [i.id, i])), [pickable]);

  // Bring back the last selection, so a leader can close the tab and return.
  // Storage throws in some privacy modes; the page works without it.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChoices(restore(raw, new Set(pickable.map((i) => i.id))));
    } catch {
      /* nothing saved */
    }
  }, [pickable]);

  // A folded section stays folded next visit. Storage is untrusted, as above.
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(FOLDED_KEY) ?? '[]');
      if (Array.isArray(saved)) {
        setFolded(new Set(saved.filter((k): k is string => typeof k === 'string')));
      }
    } catch {
      /* everything open */
    }
  }, []);

  function toggleFolded(key: string) {
    // Built on the latest set, so two toggles before a re-render both count.
    // Saving here is idempotent, so a repeated call in Strict Mode is harmless.
    setFolded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(FOLDED_KEY, JSON.stringify([...next]));
      } catch {
        /* it just will not stay folded */
      }
      return next;
    });
  }

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

  /** The ticked items, in the order they will print. */
  const chosen = useMemo(
    () =>
      choices.order === 'book'
        ? inBookOrder(
            pickable.filter((i) => selected.has(i.id)),
            kinds,
          )
        : choices.selected.flatMap((id) => byId.get(id) ?? []),
    [choices.order, choices.selected, pickable, selected, byId, kinds],
  );

  // A row that React moves is taken out of the page and put back, which drops
  // focus in some browsers, so put it back on the control that was in use.
  useEffect(() => {
    if (!focusAfter.current) return;
    document.querySelector<HTMLElement>(focusAfter.current)?.focus({ preventScroll: true });
    focusAfter.current = null;
  }, [chosen]);

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
    update({
      selected: on
        ? // Already-ticked ones keep their place in a running order.
          [...choices.selected, ...list.filter((i) => !selected.has(i.id)).map((i) => i.id)]
        : choices.selected.filter((id) => !ids.has(id)),
    });
  }

  /** Move an item to position `to`, which makes the order the leader's own. */
  function move(id: string, to: number) {
    const ids = chosen.map((i) => i.id);
    const from = ids.indexOf(id);
    if (from < 0 || to < 0 || to >= ids.length || to === from) return false;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    update({ selected: ids, order: 'mine' });
    setAnnouncement(`${byId.get(id)?.title} moved to number ${to + 1} of ${ids.length}.`);
    return true;
  }

  function step(id: string, by: -1 | 1) {
    const to = chosen.findIndex((i) => i.id === id) + by;
    if (!move(id, to)) return;
    // At either end the button just pressed is disabled, so use its partner.
    const atEnd = to === 0 || to === chosen.length - 1;
    focusAfter.current = `[data-row="${id}"] [data-move="${atEnd ? -by : by}"]`;
  }

  function remove(id: string) {
    const index = chosen.findIndex((i) => i.id === id);
    const next = chosen[index + 1] ?? chosen[index - 1];
    focusAfter.current = next ? `[data-row="${next.id}"] [data-remove]` : '#export-pick';
    update({ selected: choices.selected.filter((s) => s !== id) });
    setAnnouncement(`${byId.get(id)?.title} taken out.`);
  }

  function dragOver(e: DragEvent<HTMLLIElement>, index: number) {
    if (!drag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const box = e.currentTarget.getBoundingClientRect();
    const gap = e.clientY < box.top + box.height / 2 ? index : index + 1;
    if (gap !== drag.gap) setDrag({ ...drag, gap });
  }

  function drop(e: DragEvent<HTMLLIElement>) {
    if (!drag) return;
    e.preventDefault();
    const from = chosen.findIndex((i) => i.id === drag.id);
    // The gap is counted with the row still in the list.
    move(drag.id, drag.gap > from ? drag.gap - 1 : drag.gap);
    setDrag(null);
  }

  /** The gap a drag would drop into, unless dropping there changes nothing. */
  const dropGap = (() => {
    if (!drag) return null;
    const from = chosen.findIndex((i) => i.id === drag.id);
    return drag.gap === from || drag.gap === from + 1 ? null : drag.gap;
  })();

  function tagLabel(item: Item) {
    return (
      item.category_label ??
      tags.find((t) => t.kind === item.kind && t.slug === item.tag)?.label ??
      item.tag
    );
  }

  /** How the list is ordered now. Shown under the list, where it can change length freely. */
  function orderStatus() {
    if (choices.order === 'book') {
      return chosenKinds.length > 1
        ? `In book order: ${chosenKinds.map((k) => k.plural).join(', then ')}.`
        : 'In book order.';
    }
    return sectionsTogether(chosen)
      ? 'In your own order. Anything else you tick goes on the end.'
      : `In your own order. Anything else you tick goes on the end. With sections mixed, each one prints marked as a ${either(chosenKinds.map((k) => k.singular))} instead of under a heading.`;
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
      link.download = `${slugify(title) || 'scoutbase-campfire'}-${choices.format}.pdf`;
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
  // A search opens every section with a match, so a folded one cannot hide results.
  const searching = query.trim() !== '';
  const howOpen = !folded.has('how');
  const howSummary = [
    choices.format === 'booklet' ? 'A5 booklet' : 'A4 pages',
    choices.cover ? 'cover and contents' : 'no cover',
    choices.newPage ? 'each on a new page' : null,
    choices.title.trim() ? `“${choices.title.trim()}”` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <section className="card" aria-labelledby="export-how">
        <h2 className="section-title" id="export-how">
          <Fold open={howOpen} controls="export-how-body" onToggle={() => toggleFolded('how')}>
            How it prints
          </Fold>
        </h2>
        {howOpen ? null : <p className="fold-summary">{howSummary}</p>}

        <div className="form fold-body" id="export-how-body" hidden={!howOpen}>
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
        </div>
      </section>

      <section className="card pick" aria-labelledby="export-pick">
        <h2 className="section-title" id="export-pick" tabIndex={-1}>
          What goes in
        </h2>
        <p className="muted-line">
          Tick as many as you like, then set the order underneath. Anything that fits on one page
          is kept on one page.
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

        {sections.map(({ kind, all, visible }) => {
          if (visible.length === 0) return null;
          const open = searching || !folded.has(kind.slug);
          const listId = `pick-list-${kind.slug}`;
          return (
            <div
              className="pick-section"
              key={kind.slug}
              role="group"
              aria-labelledby={`pick-${kind.slug}`}
            >
              <div className="pick-head">
                <h3 className="pick-title" id={`pick-${kind.slug}`}>
                  {searching ? (
                    kind.label
                  ) : (
                    <Fold open={open} controls={listId} onToggle={() => toggleFolded(kind.slug)}>
                      {kind.label}
                    </Fold>
                  )}
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
              <ul className="pick-list" id={listId} hidden={!open}>
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
          );
        })}
      </section>

      {/* Below the checklist on purpose: a list that grows above the row being
          ticked would shove that row down the screen with every tap. */}
      {chosen.length > 0 ? (
        <section className="card order" id="running-order" aria-labelledby="export-order">
          <h2 className="section-title" id="export-order">
            Running order
          </h2>
          <p className="muted-line">
            {chosen.length === 1
              ? 'Tick another and you can put them in any order.'
              : 'This is the order they print in. Use the arrows to move one.'}
          </p>

          <ol className="order-list">
            {chosen.map((item, index) => {
              const kind = kinds.find((k) => k.slug === item.kind);
              return (
                <li
                  key={item.id}
                  className="order-row"
                  data-row={item.id}
                  data-dragging={drag?.id === item.id || undefined}
                  data-drop={
                    dropGap === index
                      ? 'before'
                      : dropGap === index + 1 && index === chosen.length - 1
                        ? 'after'
                        : undefined
                  }
                  draggable={chosen.length > 1}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    // Firefox will not start a drag that carries no data.
                    e.dataTransfer.setData('text/plain', item.title);
                    setDrag({ id: item.id, gap: index });
                  }}
                  onDragOver={(e) => dragOver(e, index)}
                  onDrop={drop}
                  onDragEnd={() => setDrag(null)}
                >
                  <span className="order-grip" aria-hidden="true" />
                  <span className="order-num">{index + 1}</span>
                  <span className="order-text">
                    <span className="pick-name">{item.title}</span>
                    <span className="pick-meta">
                      {kind ? `${capitalise(kind.singular)} · ` : null}
                      {tagLabel(item)}
                    </span>
                  </span>
                  <span className="order-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      data-move="-1"
                      disabled={index === 0}
                      onClick={() => step(item.id, -1)}
                      aria-label={`Move ${item.title} up`}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M3.5 10 8 5.5l4.5 4.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      data-move="1"
                      disabled={index === chosen.length - 1}
                      onClick={() => step(item.id, 1)}
                      aria-label={`Move ${item.title} down`}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M3.5 6 8 10.5 12.5 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      data-remove
                      onClick={() => remove(item.id)}
                      aria-label={`Take ${item.title} out`}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="m4.5 4.5 7 7m0-7-7 7" />
                      </svg>
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Under the list rather than above it: when this grows, the rows
              must not move out from under a finger pressing an arrow. */}
          {chosen.length > 1 ? (
            <div className="order-status">
              <p className="muted-line">{orderStatus()}</p>
              {choices.order === 'mine' ? (
                <button
                  type="button"
                  className="small-btn"
                  onClick={() => {
                    update({ order: 'book' });
                    setAnnouncement('Back in book order.');
                  }}
                >
                  Put back in book order
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Outside the list, so taking out the last one can still be announced. */}
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>

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
          {chosen.length > 1 ? (
            <a href="#running-order" className="linklike">
              Order
            </a>
          ) : null}
          {chosen.length > 0 ? (
            <button
              type="button"
              className="linklike"
              onClick={() => update({ selected: [], order: 'book' })}
            >
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
