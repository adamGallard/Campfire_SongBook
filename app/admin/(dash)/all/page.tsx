import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ConfirmButton } from '@/components/ConfirmButton';
import { requireAllBooksAdmin } from '@/lib/auth';
import { allBrands, bookHref, BOOK, isBookSlug, type BookSlug } from '@/lib/brand';
import { createClient } from '@/lib/supabase/server';
import { removeAdmin, setSectionEnabled } from '../actions';
import { AddAdminForm } from '../admins/AddAdminForm';
import { AdminAccessForm } from './AdminAccessForm';

export const metadata = { title: 'All books' };

const DAY = 24 * 60 * 60 * 1000;

interface KindRow {
  slug: string;
  label: string;
  book: string;
  enabled: boolean;
  sort_order: number;
}

interface SubRow {
  id: string;
  title: string;
  kind: string;
  status: 'pending' | 'approved' | 'rejected';
  submitter_name: string | null;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface AdminRow {
  email: string;
  note: string | null;
  books: string[] | null;
  created_at: string;
}

/** Every row, a page at a time: PostgREST stops at 1000 rows per request. */
async function fetchAll<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from(table).select(columns).range(from, from + 999);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return rows;
  }
}

function date(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ago(iso: string, now: number) {
  const days = Math.floor((now - new Date(iso).getTime()) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return date(iso);
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export default async function AllBooksPage() {
  const me = await requireAllBooksAdmin();
  const supabase = await createClient();
  const now = Date.now();

  const [kinds, items, subs, admins] = await Promise.all([
    fetchAll<KindRow>(supabase, 'kinds', 'slug, label, book, enabled, sort_order'),
    fetchAll<{ kind: string; published: boolean }>(supabase, 'items', 'kind, published'),
    fetchAll<SubRow>(
      supabase,
      'submissions',
      'id, title, kind, status, submitter_name, reviewed_by_email, reviewed_at, created_at',
    ),
    fetchAll<AdminRow>(supabase, 'admins', 'email, note, books, created_at'),
  ]);

  kinds.sort((a, b) => a.sort_order - b.sort_order);
  const kindBySlug = new Map(kinds.map((k) => [k.slug, k]));
  const bookOf = (kind: string) => kindBySlug.get(kind)?.book as BookSlug | undefined;

  const itemCount = new Map<string, { total: number; published: number }>();
  for (const it of items) {
    const c = itemCount.get(it.kind) ?? { total: 0, published: 0 };
    c.total += 1;
    if (it.published) c.published += 1;
    itemCount.set(it.kind, c);
  }

  const monthAgo = now - 30 * DAY;
  const books = allBrands.map((b) => {
    const bookKinds = kinds.filter((k) => k.book === b.slug);
    const bookSubs = subs.filter((s) => bookOf(s.kind) === b.slug);
    const pending = bookSubs
      .filter((s) => s.status === 'pending')
      .sort((x, y) => x.created_at.localeCompare(y.created_at));
    const counts = bookKinds.map((k) => itemCount.get(k.slug) ?? { total: 0, published: 0 });
    return {
      brand: b,
      kinds: bookKinds,
      sectionsOn: bookKinds.filter((k) => k.enabled).length,
      total: counts.reduce((n, c) => n + c.total, 0),
      published: counts.reduce((n, c) => n + c.published, 0),
      // Items only reach readers through a switched-on section.
      live: bookKinds.reduce(
        (n, k) => n + (k.enabled ? (itemCount.get(k.slug)?.published ?? 0) : 0),
        0,
      ),
      pending,
      approved: bookSubs.filter((s) => s.status === 'approved').length,
      rejected: bookSubs.filter((s) => s.status === 'rejected').length,
      lastMonth: bookSubs.filter((s) => new Date(s.created_at).getTime() > monthAgo).length,
      admins: admins.filter((a) => a.books === null || a.books.includes(b.slug)).length,
    };
  });

  const waiting = books
    .flatMap((b) => b.pending.map((s) => ({ ...s, book: b.brand })))
    .sort((x, y) => x.created_at.localeCompare(y.created_at));

  const decided = subs
    .filter((s) => s.status !== 'pending' && s.reviewed_at)
    .sort((x, y) => (y.reviewed_at ?? '').localeCompare(x.reviewed_at ?? ''))
    .slice(0, 8);

  const reviews = new Map<string, number>();
  for (const s of subs) {
    if (s.status === 'pending' || !s.reviewed_by_email) continue;
    const key = s.reviewed_by_email.toLowerCase();
    reviews.set(key, (reviews.get(key) ?? 0) + 1);
  }

  const bookChoices = allBrands.map((b) => ({ slug: b.slug, name: b.name }));
  const bookName = (slug: string) => allBrands.find((b) => b.slug === slug)?.name ?? slug;
  const sortedAdmins = [...admins].sort(
    (a, b) => Number(b.books === null) - Number(a.books === null) || a.email.localeCompare(b.email),
  );

  const tiles = [
    {
      value: waiting.length,
      label: 'waiting for review',
      note: waiting.length ? `oldest sent ${ago(waiting[0].created_at, now)}` : 'all caught up',
      href: '#waiting',
    },
    {
      value: books.reduce((n, b) => n + b.lastMonth, 0),
      label: 'sent in, last 30 days',
      note: `${subs.length} ever`,
    },
    {
      value: books.reduce((n, b) => n + b.live, 0),
      label: 'showing to readers',
      note: `of ${items.length} written`,
      href: '#sections',
    },
    {
      value: admins.length,
      label: admins.length === 1 ? 'admin' : 'admins',
      note: `${admins.filter((a) => a.books === null).length} for every book`,
      href: '#admins',
    },
  ];

  return (
    <main className="wrap list all-books">
      <div className="card">
        <h2 className="section-title">All books</h2>
        <p className="muted-line" style={{ marginBottom: 0 }}>
          Every handbook at a glance. Reviewing and editing still happen on each book’s own site,
          which has its own sign-in.
        </p>
      </div>

      <div className="stat-grid">
        {tiles.map((t) => {
          const body = (
            <>
              <span className="stat-value">{t.value}</span>
              <span className="stat-label">{t.label}</span>
              <span className="stat-note">{t.note}</span>
            </>
          );
          return t.href ? (
            <a key={t.label} href={t.href} className="stat">
              {body}
            </a>
          ) : (
            <div key={t.label} className="stat">
              {body}
            </div>
          );
        })}
      </div>

      <div className="book-grid">
        {books.map((b) => (
          <div key={b.brand.slug} className="card book-card" data-tag={b.brand.slug}>
            <div className="book-card-head">
              <h3 className="book-name">{b.brand.name}</h3>
              {b.brand.slug === BOOK ? <span className="status">this site</span> : null}
            </div>
            <ul className="book-facts">
              <li>
                <strong>{b.live}</strong> showing to readers
                {b.total > b.live ? <span className="faint"> · {b.total} written</span> : null}
              </li>
              <li>
                <strong>
                  {b.sectionsOn} of {b.kinds.length}
                </strong>{' '}
                sections switched on
              </li>
              <li>
                <strong>{b.pending.length}</strong> waiting for review
                {b.pending.length ? (
                  <span className="faint"> · oldest {ago(b.pending[0].created_at, now)}</span>
                ) : null}
              </li>
              <li>
                {b.approved} approved, {b.rejected} declined ·{' '}
                {plural(b.lastMonth, 'new one')} this month
              </li>
              <li>{plural(b.admins, 'admin')}</li>
            </ul>
            <div className="row-actions">
              <a href={bookHref(b.brand.slug, '/admin')} className="small-btn">
                Admin
              </a>
              <a href={bookHref(b.brand.slug, '/admin/submissions')} className="small-btn">
                Submissions
                {b.pending.length ? <span className="badge">{b.pending.length}</span> : null}
              </a>
              <a href={bookHref(b.brand.slug, '/')} className="small-btn">
                View site
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="card" id="waiting">
        <h2 className="section-title">Waiting for review</h2>
        <p className="muted-line">Oldest first, across every book.</p>
        {waiting.length === 0 ? (
          <p className="empty">Nothing waiting in any book.</p>
        ) : (
          waiting.map((s) => (
            <div className="row" key={s.id}>
              <span className="book-dot" data-tag={s.book.slug} aria-hidden />
              <div className="row-main">
                <div className="row-title">{s.title}</div>
                <div className="row-meta">
                  {s.book.name} · {kindBySlug.get(s.kind)?.label ?? s.kind}
                  {s.submitter_name ? ` · from ${s.submitter_name}` : ''} · sent{' '}
                  {ago(s.created_at, now)}
                </div>
              </div>
              <div className="row-actions">
                <a href={bookHref(s.book.slug, `/admin/submissions/${s.id}`)} className="small-btn">
                  Review
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card" id="sections">
        <h2 className="section-title">Sections</h2>
        <p className="muted-line">
          A section stays off the site, the planner and the submission form until it is switched
          on. Check its items first. Other books’ sites catch up within a minute.
        </p>
        {books.map((b) => (
          <div key={b.brand.slug} className="section-group">
            <h3 className="group-title">
              <span className="book-dot" data-tag={b.brand.slug} aria-hidden /> {b.brand.name}
            </h3>
            {b.kinds.map((k) => {
              const c = itemCount.get(k.slug) ?? { total: 0, published: 0 };
              return (
                <div className="row" key={k.slug}>
                  <div className="row-main">
                    <div className="row-title">{k.label}</div>
                    <div className="row-meta">
                      {c.published} published
                      {c.total > c.published ? `, ${c.total - c.published} hidden` : ''}
                    </div>
                  </div>
                  <div className="row-actions">
                    <span className="status" data-status={k.enabled ? 'approved' : undefined}>
                      {k.enabled ? 'on' : 'off'}
                    </span>
                    <form action={setSectionEnabled}>
                      <input type="hidden" name="slug" value={k.slug} />
                      <input type="hidden" name="enabled" value={k.enabled ? '0' : '1'} />
                      <ConfirmButton
                        className="small-btn"
                        message={
                          k.enabled
                            ? `Switch off ${b.brand.name} → ${k.label}? It disappears from the site.`
                            : `Switch on ${b.brand.name} → ${k.label}? Its ${c.published} published items appear on the site.`
                        }
                      >
                        {k.enabled ? 'Switch off' : 'Switch on'}
                      </ConfirmButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="section-title">Recent decisions</h2>
        <p className="muted-line">The last submissions approved or declined, in any book.</p>
        {decided.length === 0 ? (
          <p className="empty">Nothing reviewed yet.</p>
        ) : (
          decided.map((s) => {
            const book = bookOf(s.kind);
            return (
              <div className="row" key={s.id}>
                <span className="book-dot" data-tag={book} aria-hidden />
                <div className="row-main">
                  <div className="row-title">{s.title}</div>
                  <div className="row-meta">
                    {book ? bookName(book) : ''} · {s.reviewed_by_email ?? 'someone'} ·{' '}
                    {ago(s.reviewed_at!, now)}
                  </div>
                </div>
                <div className="row-actions">
                  <span className="status" data-status={s.status}>
                    {s.status}
                  </span>
                  {book ? (
                    <a href={bookHref(book, `/admin/submissions/${s.id}`)} className="small-btn">
                      Open
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div id="admins" className="stack">
        <div className="card">
          <h2 className="section-title">Admins</h2>
          <p className="muted-line" style={{ marginBottom: 0 }}>
            An admin for every book can use this page and manage this list. An admin for some books
            can edit and review only those, and the database holds them to it. Changes take effect
            on their next page load.
          </p>
        </div>

        <AddAdminForm books={bookChoices} />

        <div className="card">
          {sortedAdmins.map((a) => {
            const isMe = a.email.toLowerCase() === me.email.toLowerCase();
            const count = reviews.get(a.email.toLowerCase()) ?? 0;
            const current = a.books === null ? null : a.books.filter(isBookSlug);
            return (
              <div className="row admin-row" key={a.email}>
                <div className="row-main">
                  <div className="row-title">{a.email}</div>
                  <div className="access-tags">
                    {a.books === null ? (
                      <span className="access-tag" data-tag="all">
                        All books
                      </span>
                    ) : (
                      a.books.map((slug) => (
                        <span key={slug} className="access-tag" data-tag={slug}>
                          {bookName(slug)}
                        </span>
                      ))
                    )}
                  </div>
                  <div className="row-meta">
                    {isMe ? 'You · ' : ''}
                    {a.note ? `${a.note} · ` : ''}added {date(a.created_at)} ·{' '}
                    {plural(count, 'review')}
                  </div>
                </div>
                <div className="row-actions">
                  {isMe ? (
                    <span className="status">this is you</span>
                  ) : (
                    <>
                      <AdminAccessForm email={a.email} books={bookChoices} current={current} />
                      <form action={removeAdmin}>
                        <input type="hidden" name="email" value={a.email} />
                        <ConfirmButton message={`Remove ${a.email} from the admin list?`}>
                          Remove
                        </ConfirmButton>
                      </form>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="hint">
        <Link href="/admin">Back to {allBrands.find((b) => b.slug === BOOK)?.name} admin</Link>
      </p>
    </main>
  );
}
