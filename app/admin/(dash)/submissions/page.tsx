import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Submission } from '@/lib/types';

function when(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = 'pending' } = await searchParams;
  const filter = ['pending', 'approved', 'rejected', 'all'].includes(status) ? status : 'pending';

  const supabase = await createClient();
  let query = supabase
    .from('submissions')
    .select('id, title, tag, submitter_name, status, created_at')
    .order('created_at', { ascending: false });

  if (filter !== 'all') query = query.eq('status', filter);

  const { data } = await query;
  const rows = (data ?? []) as Pick<
    Submission,
    'id' | 'title' | 'tag' | 'submitter_name' | 'status' | 'created_at'
  >[];

  const tabs = [
    { key: 'pending', label: 'Waiting' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Declined' },
    { key: 'all', label: 'All' },
  ];

  return (
    <main className="wrap list">
      <div className="card">
        <h2 className="section-title">Submissions</h2>
        <p className="muted-line">Songs sent in from the public page.</p>
        <div className="chips">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/admin/submissions?status=${t.key}`}
              className="chip"
              aria-pressed={filter === t.key}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <p className="empty">
            {filter === 'pending' ? 'Nothing waiting for review.' : 'Nothing here.'}
          </p>
        ) : (
          rows.map((row) => (
            <div className="row" key={row.id}>
              <div className="row-main">
                <div className="row-title">{row.title}</div>
                <div className="row-meta">
                  {row.submitter_name ? `From ${row.submitter_name} · ` : ''}
                  {when(row.created_at)}
                  {row.tag ? ` · ${row.tag}` : ''}
                </div>
              </div>
              <div className="row-actions">
                <span className="status" data-status={row.status}>
                  {row.status === 'pending' ? 'waiting' : row.status}
                </span>
                <Link href={`/admin/submissions/${row.id}`} className="small-btn">
                  {row.status === 'pending' ? 'Review' : 'Open'}
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
