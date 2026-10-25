'use client';

import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Intro } from './Intro';
import { FootBrand, Handbooks, Masthead } from './SiteChrome';
import { appName, bookHref, brand, brandFor, type BookSlug } from '@/lib/brand';
import type { OasBook as OasData, OasPart, OasStage, OasStatement } from '@/lib/oas';

/**
 * The OAS book: every Outdoor Adventure Skills statement on one page, filtered
 * by stream, stage, activity and plan–do–review, and searched word for word,
 * guidance included. Like the other books, it all ships in the first load, so
 * it keeps working with no signal once it has been opened.
 *
 * The filters live in the address (?stream=camping&stage=3), so a leader can
 * send a Scout straight to their next stage.
 */

const PARTS: { slug: OasPart; label: string }[] = [
  { slug: 'plan', label: 'Plan' },
  { slug: 'do', label: 'Do' },
  { slug: 'review', label: 'Review' },
];

const STAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Searches worth trying, for someone who does not know what to look for. */
const TRY = ['knot', 'map', 'compass', 'first aid', 'weather', 'leave no trace', 'cooking'];

/** Another ScoutBase handbook that teaches what a statement asks for. */
const SEE_ALSO: { book: BookSlug; pattern: RegExp; label: string }[] = [
  {
    book: 'pioneering',
    pattern: /\b(knots?|lashings?|hitch(es)?|bowline|pioneering)\b/i,
    label: 'knots and lashings, step by step',
  },
  {
    book: 'bushcraft',
    pattern: /\b(fires?|campfires?|fireplaces?|tinder|kindling|fire ?lighting)\b/i,
    label: 'lighting a fire, step by step',
  },
];

interface Filters {
  stream: string;
  /** The last activity on the path ("swift-water-rescue"), or "all". */
  path: string;
  /** 0 for every stage. */
  stage: number;
  part: OasPart | 'all';
  query: string;
}

const START: Filters = { stream: 'all', path: 'all', stage: 0, part: 'all', query: '' };

function pathSlug(key: string): string {
  return key.slice(key.lastIndexOf('/') + 1);
}

/** The filters in the address, kept only where they name something real. */
function readAddress(book: OasData): Filters {
  const params = new URLSearchParams(window.location.search);
  const stream = book.streams.some((s) => s.slug === params.get('stream'))
    ? (params.get('stream') as string)
    : 'all';
  const path = book.paths.some((p) => p.stream === stream && pathSlug(p.key) === params.get('activity'))
    ? (params.get('activity') as string)
    : 'all';
  const stage = Number(params.get('stage'));
  const part = PARTS.find((p) => p.slug === params.get('part'))?.slug ?? 'all';
  return {
    stream,
    path,
    stage: STAGES.includes(stage) ? stage : 0,
    part,
    query: (params.get('q') ?? '').slice(0, 80),
  };
}

function writeAddress(f: Filters) {
  const params = new URLSearchParams();
  if (f.stream !== 'all') params.set('stream', f.stream);
  if (f.path !== 'all') params.set('activity', f.path);
  if (f.stage) params.set('stage', String(f.stage));
  if (f.part !== 'all') params.set('part', f.part);
  if (f.query.trim()) params.set('q', f.query.trim());
  const search = params.toString();
  const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
  if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(window.history.state, '', url);
  }
}

/** Same on the server and in every browser, whatever their time zone. */
function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  });
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-AU')} ${n === 1 ? one : many}`;
}

/** Marks every place the search appears. */
function highlight(text: string, q: string): ReactNode {
  if (!q) return text;
  const lower = text.toLowerCase();
  const out: ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(q);
  while (at !== -1) {
    if (at > from) out.push(text.slice(from, at));
    out.push(<mark key={at}>{text.slice(at, at + q.length)}</mark>);
    from = at + q.length;
    at = lower.indexOf(q, from);
  }
  if (from < text.length) out.push(text.slice(from));
  return out;
}

const statementKey = (stage: OasStage, s: OasStatement) => `${stage.key}#${s.id}`;

export function OasBook({ book }: { book: OasData }) {
  const [filters, setFilters] = useState<Filters>(START);
  const [moreOpen, setMoreOpen] = useState(false);
  const [allGuidance, setAllGuidance] = useState(false);
  // Statements opened or closed by hand; anything else follows allGuidance.
  const [toggled, setToggled] = useState<Map<string, boolean>>(() => new Map());

  // Read the address once the page is in the browser (it is built without
  // one), and only then start writing the filters back to it.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const fromAddress = readAddress(book);
    setFilters(fromAddress);
    if (fromAddress.part !== 'all' || fromAddress.path !== 'all') setMoreOpen(true);
    setReady(true);
  }, [book]);

  useEffect(() => {
    if (ready) writeAddress(filters);
  }, [filters, ready]);

  // Typing stays quick; the list catches up a moment later.
  const query = useDeferredValue(filters.query.trim().toLowerCase());

  const streamBySlug = useMemo(() => new Map(book.streams.map((s) => [s.slug, s])), [book]);
  const stream = streamBySlug.get(filters.stream);
  const streamPaths = useMemo(
    () => book.paths.filter((p) => p.stream === filters.stream),
    [book, filters.stream],
  );
  const path = streamPaths.find((p) => pathSlug(p.key) === filters.path);

  const counts = useMemo(() => {
    const byStream = new Map<string, number>();
    for (const st of book.stages) {
      byStream.set(st.stream, (byStream.get(st.stream) ?? 0) + st.statements.length);
    }
    return byStream;
  }, [book]);
  const total = useMemo(() => [...counts.values()].reduce((n, c) => n + c, 0), [counts]);

  const haystacks = useMemo(() => {
    const map = new Map<string, { text: string; details: string }>();
    for (const st of book.stages) {
      for (const s of st.statements) {
        map.set(statementKey(st, s), { text: s.text.toLowerCase(), details: s.details.toLowerCase() });
      }
    }
    return map;
  }, [book]);

  const groups = useMemo(() => {
    const inPath = path ? new Set(path.stages) : null;
    return book.stages
      .filter(
        (st) =>
          (filters.stream === 'all' || st.stream === filters.stream) &&
          (!filters.stage || st.stage === filters.stage) &&
          (!inPath || inPath.has(st.key)),
      )
      .map((st) => ({
        stage: st,
        statements: st.statements.filter((s) => {
          if (filters.part !== 'all' && s.part !== filters.part) return false;
          if (!query) return true;
          const hay = haystacks.get(statementKey(st, s));
          return Boolean(hay && (hay.text.includes(query) || hay.details.includes(query)));
        }),
      }))
      .filter((g) => g.statements.length > 0);
  }, [book, filters.stream, filters.stage, filters.part, path, query, haystacks]);

  const shown = groups.reduce((n, g) => n + g.statements.length, 0);
  const overview =
    filters.stream === 'all' && !query && !filters.stage && filters.part === 'all';
  const extraCount = (filters.part !== 'all' ? 1 : 0) + (filters.path !== 'all' ? 1 : 0);

  function update(patch: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function chooseStream(slug: string) {
    update({ stream: slug, path: 'all' });
    window.scrollTo({ top: 0 });
  }

  function isOpen(stage: OasStage, s: OasStatement): boolean {
    const key = statementKey(stage, s);
    const byHand = toggled.get(key);
    if (byHand !== undefined) return byHand;
    if (allGuidance) return true;
    // A search that only matched the guidance opens it, to show why.
    const hay = haystacks.get(key);
    return Boolean(query && hay && !hay.text.includes(query) && hay.details.includes(query));
  }

  function toggle(stage: OasStage, s: OasStatement) {
    const key = statementKey(stage, s);
    const open = isOpen(stage, s);
    setToggled((prev) => new Map(prev).set(key, !open));
  }

  function showAllGuidance(on: boolean) {
    setAllGuidance(on);
    setToggled(new Map());
  }

  const heading = stream?.title ?? 'Outdoor Adventure Skills';
  const lede = stream
    ? `${stream.description} ${plural(counts.get(stream.slug) ?? 0, 'statement')} from Stage 1 to Stage 9.`
    : `${plural(total, 'statement')} across ${book.streams.length} streams, from Stage 1 to Stage 9, with the guidance for each, read straight from Scouts | Terrain.`;

  // What the printout is of, for the line at the top of the page.
  const printTitle = [
    stream?.title ?? 'Outdoor Adventure Skills',
    path && streamPaths.length > 1 ? path.label : null,
    filters.stage ? `Stage ${filters.stage}` : null,
    filters.part !== 'all' ? PARTS.find((p) => p.slug === filters.part)?.label : null,
    query ? `“${filters.query.trim()}”` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <Masthead />
          <h1>{heading}</h1>
          <div className="rule" />
          <p className="lede">{lede}</p>

          <div className="sections" role="tablist" aria-label="Stream">
            <button
              type="button"
              role="tab"
              className="section-btn"
              aria-selected={filters.stream === 'all'}
              onClick={() => chooseStream('all')}
            >
              All streams
            </button>
            {book.streams.map((s) => (
              <button
                key={s.slug}
                type="button"
                role="tab"
                className="section-btn"
                aria-selected={filters.stream === s.slug}
                onClick={() => chooseStream(s.slug)}
              >
                {s.title}
                <span className="section-count">{counts.get(s.slug) ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="wrap">
        <Intro />
      </div>

      <div className="searchbar">
        <div className="wrap">
          {/* Filters sits by the search, where a phone can always see it. */}
          <div className="oas-search-row">
            <input
              className="search"
              type="search"
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
              placeholder="Search every statement…"
              aria-label="Search the statements"
            />
            <button
              type="button"
              className="chip chip-more"
              aria-expanded={moreOpen}
              aria-controls="more-filters"
              onClick={() => setMoreOpen((open) => !open)}
            >
              Filters{extraCount ? ` · ${extraCount}` : ''}
            </button>
          </div>
          <div className="chips" role="group" aria-label="Stage">
            <button
              type="button"
              className="chip"
              aria-pressed={!filters.stage}
              onClick={() => update({ stage: 0 })}
            >
              Every stage
            </button>
            {STAGES.map((n) => (
              <button
                key={n}
                type="button"
                className="chip oas-stage-chip"
                aria-pressed={filters.stage === n}
                aria-label={`Stage ${n}`}
                onClick={() => update({ stage: n })}
              >
                {n}
              </button>
            ))}
          </div>
          {moreOpen ? (
            <div id="more-filters" className="more-filters">
              <ChipRow
                label="Part"
                options={PARTS}
                value={filters.part}
                onPick={(part) => update({ part: part as Filters['part'] })}
              />
              {streamPaths.length > 1 ? (
                <ChipRow
                  label="Activity"
                  options={streamPaths.map((p) => ({ slug: pathSlug(p.key), label: p.label }))}
                  value={filters.path}
                  onPick={(slug) => update({ path: slug })}
                  wrap
                />
              ) : (
                <p className="oas-filter-note">
                  {filters.stream === 'all'
                    ? 'Pick a stream to filter by its activities.'
                    : `${stream?.title} has no separate activities: every stage is the same for everyone.`}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <main className="wrap list oas-list">
        <p className="print-only oas-print-head">
          <strong>{printTitle}</strong>
          <br />
          {appName} · Statements from Scouts | Terrain, checked {longDate(book.checkedAt)}. ©
          The Scout Association of Australia.
        </p>

        {overview ? (
          <Overview book={book} counts={counts} onPick={chooseStream} onTry={(q) => update({ query: q })} />
        ) : shown === 0 ? (
          <p className="empty">No statement matches that. Try a shorter word, or fewer filters.</p>
        ) : (
          <>
            <div className="oas-toolbar">
              <p>
                {plural(shown, 'statement')} in {plural(groups.length, 'stage')}
              </p>
              <div className="oas-toolbar-actions">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={allGuidance}
                  onClick={() => showAllGuidance(!allGuidance)}
                >
                  {allGuidance ? 'Hide the guidance' : 'Show all guidance'}
                </button>
                <button type="button" className="chip" onClick={() => window.print()}>
                  {brand.plan.label}
                </button>
              </div>
            </div>

            {groups.map(({ stage, statements }) => (
              <StageCard
                key={stage.key}
                stage={stage}
                statements={statements}
                streamTitle={streamBySlug.get(stage.stream)?.title ?? stage.stream}
                query={query}
                isOpen={(s) => isOpen(stage, s)}
                onToggle={(s) => toggle(stage, s)}
              />
            ))}
          </>
        )}
      </main>

      <footer className="footer">
        <div className="wrap">
          <FootBrand />
          <p className="footlede">
            {appName} is not an official Scouts Australia site. The Outdoor Adventure Skills are ©
            The Scout Association of Australia: the statements and guidance here are read from
            Scouts | Terrain, last checked on {longDate(book.checkedAt)}. Record and verify progress
            in Terrain.
          </p>
          <p className="footlede">
            Running OAS for a whole Group?{' '}
            <a className="oas-sb-link" href="https://www.scoutbase.app/features">
              ScoutBase
            </a>{' '}
            tracks progress across OAS, Milestones and SIAs, and finds the gaps worth covering next.
          </p>
          <Handbooks />
          <p className="footmeta">
            {appName} · {plural(total, 'statement')} · {plural(book.streams.length, 'stream')}
          </p>
        </div>
      </footer>
    </>
  );
}

function ChipRow({
  label,
  options,
  value,
  onPick,
  wrap = false,
}: {
  label: string;
  options: { slug: string; label: string }[];
  value: string;
  onPick: (slug: string) => void;
  /** Long labels ("Life Saving → Swift Water Rescue") wrap rather than scroll off. */
  wrap?: boolean;
}) {
  return (
    <div className={wrap ? 'chip-group oas-group-wrap' : 'chip-group'} role="group" aria-label={label}>
      <span className="chip-group-label">{label}</span>
      <div className={wrap ? 'chips oas-chips-wrap' : 'chips'}>
        {[{ slug: 'all', label: 'Any' }, ...options].map((o) => (
          <button
            key={o.slug}
            type="button"
            className="chip"
            aria-pressed={value === o.slug}
            onClick={() => onPick(o.slug)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The landing view: every stream to choose from, core first. */
function Overview({
  book,
  counts,
  onPick,
  onTry,
}: {
  book: OasData;
  counts: Map<string, number>;
  onPick: (slug: string) => void;
  onTry: (query: string) => void;
}) {
  const groups = [
    { title: 'Core streams', streams: book.streams.filter((s) => s.core) },
    { title: 'Specialist streams', streams: book.streams.filter((s) => !s.core) },
  ];
  return (
    <>
      {groups.map((g) => (
        <section key={g.title} className="oas-overview">
          <h2 className="oas-group-title">{g.title}</h2>
          <div className="oas-stream-grid">
            {g.streams.map((s) => {
              // The activities a Scout chooses between from Stage 4.
              const activities = book.stages
                .filter((st) => st.stream === s.slug && st.stage === 4 && st.branch !== s.slug)
                .map((st) => st.branchTitle);
              return (
                <button key={s.slug} type="button" className="oas-stream" onClick={() => onPick(s.slug)}>
                  <span className="oas-stream-title">{s.title}</span>
                  <span className="oas-stream-desc">{s.description}</span>
                  <span className="oas-stream-meta">
                    {plural(counts.get(s.slug) ?? 0, 'statement')}
                    {activities.length ? ` · from Stage 4: ${activities.join(', ')}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <div className="chip-group oas-group-wrap oas-try" role="group" aria-label="Try a search">
        <span className="chip-group-label">Try</span>
        <div className="chips oas-chips-wrap">
          {TRY.map((q) => (
            <button key={q} type="button" className="chip" onClick={() => onTry(q)}>
              {q}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function StageCard({
  stage,
  statements,
  streamTitle,
  query,
  isOpen,
  onToggle,
}: {
  stage: OasStage;
  statements: OasStatement[];
  streamTitle: string;
  query: string;
  isOpen: (s: OasStatement) => boolean;
  onToggle: (s: OasStatement) => void;
}) {
  const activity = stage.branch !== stage.stream ? stage.branchTitle : null;
  return (
    <article className="card oas-stage">
      <div className="card-head">
        <span className="pill">{streamTitle}</span>
        <span className="oas-stage-count">{plural(statements.length, 'statement')}</span>
      </div>
      <h2>
        Stage {stage.stage}
        {activity ? ` · ${activity}` : ''}
      </h2>
      {PARTS.map((part) => {
        const inPart = statements.filter((s) => s.part === part.slug);
        if (!inPart.length) return null;
        return (
          <section key={part.slug} className="oas-part">
            <h3 className="oas-part-head">{part.label}</h3>
            <ul className="oas-statements">
              {inPart.map((s) => (
                <Statement
                  key={s.id}
                  id={`oas-${stage.key.replace(/\//g, '-')}-${s.id}`}
                  statement={s}
                  query={query}
                  open={isOpen(s)}
                  onToggle={() => onToggle(s)}
                />
              ))}
            </ul>
          </section>
        );
      })}
      {stage.verify.length ? (
        <p className="oas-verify">To finish the stage: {stage.verify.join(' ')}</p>
      ) : null}
    </article>
  );
}

function Statement({
  id,
  statement,
  query,
  open,
  onToggle,
}: {
  id: string;
  statement: OasStatement;
  query: string;
  open: boolean;
  onToggle: () => void;
}) {
  if (!statement.details) {
    return (
      <li className="oas-statement">
        <p className="oas-statement-row">
          <span className="oas-box" aria-hidden="true" />
          <span className="oas-text">{highlight(statement.text, query)}</span>
        </p>
      </li>
    );
  }
  return (
    <li className="oas-statement">
      <button
        type="button"
        className="oas-statement-row oas-statement-btn"
        aria-expanded={open}
        aria-controls={`${id}-guidance`}
        onClick={onToggle}
      >
        <span className="oas-box" aria-hidden="true" />
        <span className="oas-text">{highlight(statement.text, query)}</span>
        <span className="oas-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="oas-guidance" id={`${id}-guidance`}>
          <Guidance text={statement.details} query={query} />
          <SeeAlso statement={statement} />
        </div>
      ) : null}
    </li>
  );
}

/** Terrain's guidance: a paragraph a line, "* " lines as a list. */
function Guidance({ text, query }: { text: string; query: string }) {
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    out.push(
      <ul key={`l${out.length}`}>
        {list.map((item, i) => (
          <li key={i}>{highlight(item, query)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  text.split('\n').forEach((line) => {
    const t = line.trim();
    const bullet = /^\*\s+(.*)$/.exec(t);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flush();
    if (t) out.push(<p key={`p${out.length}`}>{highlight(t, query)}</p>);
  });
  flush();
  return <>{out}</>;
}

/** A link to the ScoutBase handbook that teaches it, where there is one. */
function SeeAlso({ statement }: { statement: OasStatement }) {
  const words = `${statement.text}\n${statement.details}`;
  const links = SEE_ALSO.filter((s) => brandFor(s.book).listed && s.pattern.test(words));
  if (!links.length) return null;
  return (
    <p className="oas-see-also">
      {links.map((s) => (
        <a key={s.book} href={bookHref(s.book, '/')}>
          ScoutBase {brandFor(s.book).name}: {s.label} →
        </a>
      ))}
    </p>
  );
}
