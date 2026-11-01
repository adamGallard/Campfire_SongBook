'use client';

import { useEffect, useRef, useState } from 'react';
import { slugify } from '@/lib/blocks';
import { qrPng, svgUrl } from '@/lib/qr';

export interface PlanLink {
  url: string;
  title: string;
  count: number;
  /** Null when the plan is too long for a QR code; the link still works. */
  qr: string | null;
}

/**
 * The link to a plan and a QR code for it. A native <dialog>, so focus stays
 * inside it, Escape closes it and the page behind cannot be tapped. Mounting it
 * opens it; `onClose` fires however it is closed.
 */
export function ShareDialog({ link, onClose }: { link: PlanLink; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');

  const copyButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
    // showModal focuses the first control, which is the link; the useful one is Copy.
    copyButton.current?.focus();
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.url);
      setNote('Link copied.');
    } catch {
      // Clipboard access is refused in some browsers and on plain http.
      field.current?.select();
      setNote('Selected. Copy it with Ctrl+C, or Cmd+C on a Mac.');
    }
  }

  async function sendToApp() {
    try {
      await navigator.share({ title: link.title, url: link.url });
    } catch {
      /* closed without choosing, which is fine */
    }
  }

  async function savePng() {
    if (!link.qr) return;
    try {
      const url = URL.createObjectURL(await qrPng(link.qr));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugify(link.title) || 'plan'}-qr.png`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setNote('The picture could not be made. Press and hold the code to save it instead.');
    }
  }

  return (
    <dialog
      ref={dialog}
      className="share-dialog"
      aria-labelledby="share-title"
      onClose={onClose}
      // The backdrop is the dialog element itself; its content is a child.
      onClick={(e) => {
        if (e.target === dialog.current) dialog.current?.close();
      }}
    >
      <div className="share-body">
        <h2 className="section-title" id="share-title">
          Share this plan
        </h2>
        <p className="muted-line">
          Anyone with this link or code sees your {link.count === 1 ? 'page' : `${link.count} pages`}{' '}
          in your order, to read on their phone. It always shows the book as it is now.
        </p>

        {link.qr ? (
          <img className="share-qr" src={svgUrl(link.qr)} alt={`QR code that opens ${link.title}`} />
        ) : (
          <p className="muted-line">
            That is too many to fit in a QR code. The link still works; try fewer pages for a code.
          </p>
        )}

        <label className="field">
          <span className="field-label">Link</span>
          <input
            ref={field}
            className="input share-url"
            readOnly
            value={link.url}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>

        <div className="share-actions">
          <button ref={copyButton} type="button" className="primary-btn" onClick={copy}>
            Copy link
          </button>
          {typeof navigator !== 'undefined' && 'share' in navigator ? (
            <button type="button" className="secondary-btn" onClick={sendToApp}>
              Share…
            </button>
          ) : null}
          {link.qr ? (
            <button type="button" className="secondary-btn" onClick={savePng}>
              Save QR code
            </button>
          ) : null}
          <a className="secondary-btn" href={link.url} target="_blank" rel="noopener">
            Open it
          </a>
        </div>

        <p className="muted-line share-note" role="status">
          {note}
        </p>

        <button type="button" className="linklike" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </div>
    </dialog>
  );
}
