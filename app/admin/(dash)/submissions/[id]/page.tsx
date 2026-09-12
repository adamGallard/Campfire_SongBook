import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SongForm } from '@/components/SongForm';
import { ConfirmButton } from '@/components/ConfirmButton';
import { createClient } from '@/lib/supabase/server';
import { approveSubmission, rejectSubmission, reopenSubmission } from '../../actions';
import type { Submission, Tag } from '@/lib/types';

export default async function ReviewSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: row }, { data: tagRows }] = await Promise.all([
    supabase.from('submissions').select('*').eq('id', id).maybeSingle(),
    supabase.from('tags').select('slug, label, sort_order').order('sort_order'),
  ]);

  if (!row) notFound();

  const submission = row as Submission;
  const tags: Tag[] = tagRows ?? [];

  return (
    <main className="wrap list">
      <div className="card">
        <div className="row-actions" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 className="section-title">{submission.title}</h2>
            <p className="muted-line" style={{ marginBottom: 0 }}>
              Sent{' '}
              {new Date(submission.created_at).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {submission.submitter_name ? ` by ${submission.submitter_name}` : ''}
              {submission.submitter_email ? ` · ${submission.submitter_email}` : ''}
            </p>
          </div>
          <span className="status" data-status={submission.status}>
            {submission.status === 'pending' ? 'waiting' : submission.status}
          </span>
        </div>

        {submission.submitter_note ? (
          <div className="preview">
            <div className="box-head">Note from the sender</div>
            <p className="lyrics" style={{ marginTop: 8 }}>
              {submission.submitter_note}
            </p>
          </div>
        ) : null}

        {submission.review_note ? (
          <div className="preview">
            <div className="box-head">Review note</div>
            <p className="lyrics" style={{ marginTop: 8 }}>
              {submission.review_note}
            </p>
          </div>
        ) : null}
      </div>

      {submission.status === 'pending' ? (
        <>
          <div className="card">
            <h3 className="section-title">Tidy it up, then approve</h3>
            <p className="muted-line" style={{ marginBottom: 0 }}>
              Edit anything below before it joins the songbook. Approving publishes it straight
              away.
            </p>
          </div>

          <SongForm
            action={approveSubmission}
            tags={tags}
            submissionId={submission.id}
            submitLabel="Approve and publish"
            initial={{
              title: submission.title,
              tag: submission.tag ?? '',
              tune: submission.tune ?? '',
              category_label: '',
              body: submission.body,
            }}
            extra={
              <label className="field">
                <span className="field-label">
                  Review note <span className="optional">optional, kept internally</span>
                </span>
                <textarea name="review_note" rows={2} className="input textarea" />
              </label>
            }
          />

          <div className="card">
            <h3 className="section-title">Not this one?</h3>
            <form action={rejectSubmission} className="form">
              <label className="field">
                <span className="field-label">
                  Why <span className="optional">optional</span>
                </span>
                <textarea
                  name="review_note"
                  rows={2}
                  className="input textarea"
                  placeholder="Already in the book as…"
                />
              </label>
              <input type="hidden" name="id" value={submission.id} />
              <div className="form-actions">
                <ConfirmButton message={`Decline "${submission.title}"?`}>Decline</ConfirmButton>
              </div>
            </form>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="box-head">The words as sent</div>
          <pre
            className="lyrics"
            style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginTop: 12 }}
          >
            {submission.body}
          </pre>
          <div className="form-actions">
            {submission.published_song_id ? (
              <Link href={`/admin/songs/${submission.published_song_id}`} className="small-btn">
                Open the published song
              </Link>
            ) : null}
            <form action={reopenSubmission}>
              <input type="hidden" name="id" value={submission.id} />
              <button className="small-btn" type="submit">
                Move back to waiting
              </button>
            </form>
            <Link href="/admin/submissions" className="linklike">
              Back to submissions
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
