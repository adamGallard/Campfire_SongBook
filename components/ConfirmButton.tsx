'use client';

import { useFormStatus } from 'react-dom';

/**
 * Submit button that asks first. Used for anything that cannot be undone —
 * deleting a song, mostly.
 */
export function ConfirmButton({
  children,
  message,
  className = 'danger-btn',
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {pending ? 'Working…' : children}
    </button>
  );
}

/**
 * Plain submit button that disables itself while the action runs. A form that
 * submits through onSubmit rather than action= passes `pending` itself, since
 * useFormStatus only sees form actions.
 */
export function SubmitButton({
  children,
  className = 'primary-btn',
  pendingLabel = 'Saving…',
  pending: pendingProp,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;

  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
