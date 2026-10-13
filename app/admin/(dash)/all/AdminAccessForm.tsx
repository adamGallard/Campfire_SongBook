'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/ConfirmButton';
import type { BookSlug } from '@/lib/brand';
import { setAdminBooks, type ItemFormResult } from '../actions';
import { BookChoice } from './BookChoice';

/** Change which books one admin looks after, folded away until asked for. */
export function AdminAccessForm({
  email,
  books,
  current,
}: {
  email: string;
  books: { slug: BookSlug; name: string }[];
  current: BookSlug[] | null;
}) {
  const [state, formAction] = useActionState<ItemFormResult, FormData>(setAdminBooks, {});

  return (
    <details className="access-edit">
      <summary className="small-btn">Change books</summary>
      <form action={formAction} className="form access-form">
        {state.error ? (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        ) : null}
        <input type="hidden" name="email" value={email} />
        <BookChoice books={books} initial={current} />
        <div className="form-actions">
          <SubmitButton className="small-btn">Save</SubmitButton>
        </div>
      </form>
    </details>
  );
}
