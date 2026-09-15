'use client';

import { useEffect, useState } from 'react';

/**
 * Installs the service worker that keeps the book readable with no signal
 * (public/sw.js), and says so when the page on screen is the saved copy.
 *
 * Production only: in development the build files are not content-hashed, so
 * a cache-first worker would keep serving stale code under hot reload.
 */
export function OfflineSupport() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        // The book still works online; it just will not be saved for later.
        console.error('[songbook] offline support could not start', err);
      });
    }

    // navigator.onLine can claim a connection that does not work, but when it
    // says there is none, there is none.
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (online) return null;

  return (
    <p className="offline-note" role="status">
      <span className="offline-dot" aria-hidden="true" />
      No signal. This is the copy saved on this device.
    </p>
  );
}
