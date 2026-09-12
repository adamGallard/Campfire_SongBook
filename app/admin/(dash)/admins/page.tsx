import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { removeAdmin } from '../actions';
import { ConfirmButton } from '@/components/ConfirmButton';
import { AddAdminForm } from './AddAdminForm';

export default async function AdminsPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from('admins').select('email, note, created_at').order('email');
  const admins = data ?? [];

  return (
    <main className="wrap list">
      <div className="card">
        <h2 className="section-title">Who can manage the songbook</h2>
        <p className="muted-line" style={{ marginBottom: 0 }}>
          Anyone on this list can sign in with a one-time link and edit songs or review
          submissions. Removing an address takes effect immediately.
        </p>
      </div>

      <AddAdminForm />

      <div className="card">
        {admins.map((a) => (
          <div className="row" key={a.email}>
            <div className="row-main">
              <div className="row-title">{a.email}</div>
              <div className="row-meta">
                {a.email.toLowerCase() === me.email.toLowerCase() ? 'You · ' : ''}
                {a.note ?? 'Added'}{' '}
                {new Date(a.created_at).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
            <div className="row-actions">
              {a.email.toLowerCase() === me.email.toLowerCase() ? (
                <span className="status">cannot remove yourself</span>
              ) : (
                <form action={removeAdmin}>
                  <input type="hidden" name="email" value={a.email} />
                  <ConfirmButton message={`Remove ${a.email} as an admin?`}>Remove</ConfirmButton>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
