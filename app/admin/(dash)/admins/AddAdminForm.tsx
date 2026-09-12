'use client';

import { useActionState } from 'react';
import { addAdmin, type ItemFormResult } from '../actions';
import { SubmitButton } from '@/components/ConfirmButton';

export function AddAdminForm() {
  const [state, formAction] = useActionState<ItemFormResult, FormData>(addAdmin, {});

  return (
    <form className="card form" action={formAction}>
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field-row">
        <label className="field">
          <span className="field-label">Email address</span>
          <input name="email" type="email" required className="input" placeholder="leader@example.com" />
        </label>
        <label className="field">
          <span className="field-label">
            Note <span className="optional">optional</span>
          </span>
          <input name="note" maxLength={120} className="input" placeholder="Cub leader" />
        </label>
      </div>

      <div className="form-actions">
        <SubmitButton pendingLabel="Adding…">Add admin</SubmitButton>
      </div>
    </form>
  );
}
