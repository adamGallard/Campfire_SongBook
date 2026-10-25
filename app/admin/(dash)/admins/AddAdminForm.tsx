'use client';

import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import { addAdmin, type ItemFormResult } from '../actions';
import { SubmitButton } from '@/components/ConfirmButton';
import type { BookSlug } from '@/lib/brand';
import { BookChoice } from '../all/BookChoice';

export function AddAdminForm({ books }: { books: { slug: BookSlug; name: string }[] }) {
  const [state, formAction, pending] = useActionState<ItemFormResult, FormData>(addAdmin, {});
  const form = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);
  const [round, setRound] = useState(0);

  // Clear the form once an address has gone in, ready for the next one.
  useEffect(() => {
    if (submitted.current && !state.error) {
      form.current?.reset();
      setRound((r) => r + 1);
    }
    submitted.current = false;
  }, [state]);

  return (
    <form
      ref={form}
      className="card form"
      // Not action=: React would reset the form even after an error, losing what
      // was typed. The effect above clears it only once an address went in.
      onSubmit={(event) => {
        event.preventDefault();
        submitted.current = true;
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <h2 className="section-title">Add an admin</h2>
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.setupCode ? (
        <p className="form-ok" role="status">
          Added. Their setup code is <strong>{state.setupCode}</strong>. Send it to them yourself:
          it is shown only this once, and they need it to choose a password.
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

      <BookChoice key={round} books={books} initial={[]} />

      <p className="hint">
        They then use <strong>First time here?</strong> on the sign-in page of their book, with
        the setup code shown here, to choose a password.
      </p>

      <div className="form-actions">
        <SubmitButton pendingLabel="Adding…" pending={pending}>
          Add admin
        </SubmitButton>
      </div>
    </form>
  );
}
