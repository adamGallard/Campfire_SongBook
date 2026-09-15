import { requireAdmin } from '@/lib/auth';
import { ChangePasswordForm } from './ChangePasswordForm';

export const metadata = { title: 'Your account' };

export default async function AccountPage() {
  const admin = await requireAdmin();

  return (
    <main className="wrap list">
      <div className="card">
        <h2 className="section-title">Your account</h2>
        <p className="muted-line" style={{ marginBottom: 0 }}>
          Signed in as <strong>{admin.email}</strong>. Changing your password here needs no email,
          so it works even when the mail quota is exhausted.
        </p>
      </div>
      <ChangePasswordForm />
    </main>
  );
}
