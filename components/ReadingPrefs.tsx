'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Mode = 'night' | 'day';

const MODE_KEY = 'songbook:mode';
const BIG_KEY = 'songbook:big';

interface Prefs {
  mode: Mode;
  big: boolean;
  toggleMode: () => void;
  toggleBig: () => void;
}

const Ctx = createContext<Prefs | null>(null);

export function ReadingPrefsProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('night');
  const [big, setBig] = useState(false);

  // Restore preferences. Wrapped because storage throws in some privacy
  // modes, and the songbook must still render if it does.
  useEffect(() => {
    try {
      const m = localStorage.getItem(MODE_KEY);
      if (m === 'day' || m === 'night') setMode(m);
      setBig(localStorage.getItem(BIG_KEY) === '1');
    } catch {
      /* no stored preferences */
    }
  }, []);

  // Reflect the current choice onto <html> for the CSS variables to pick up.
  // Deliberately does NOT write to storage: doing so here races the restore
  // above and, under Strict Mode's double mount, resets the saved choice.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.mode = mode;
    root.dataset.big = big ? '1' : '0';
    root.style.colorScheme = mode === 'night' ? 'dark' : 'light';
  }, [mode, big]);

  const remember = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* preferences just will not persist */
    }
  };

  return (
    <Ctx.Provider
      value={{
        mode,
        big,
        toggleMode: () => {
          const next = mode === 'night' ? 'day' : 'night';
          setMode(next);
          remember(MODE_KEY, next);
        },
        toggleBig: () => {
          const next = !big;
          setBig(next);
          remember(BIG_KEY, next ? '1' : '0');
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useReadingPrefs(): Prefs {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useReadingPrefs must be used inside ReadingPrefsProvider');
  return ctx;
}

/**
 * Night mode and big type, as two round icon buttons at the top right of every
 * page. Which icon shows, and whether it looks pressed, follows the attributes
 * on <html>, which the layout sets before first paint; React state only arrives
 * after hydration, so a daylight reader would otherwise see a moon flash first.
 */
export function ReadingToggles() {
  const { mode, big, toggleMode, toggleBig } = useReadingPrefs();
  const night = mode === 'night';

  return (
    <div className="reading-toggles" role="group" aria-label="Reading">
      <button
        type="button"
        className="toggle-btn toggle-mode"
        aria-pressed={night}
        aria-label="Night mode"
        title={night ? 'Night mode: on' : 'Night mode: off'}
        onClick={toggleMode}
      >
        <svg viewBox="0 0 24 24" className="icon-moon" aria-hidden="true">
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
        </svg>
        <svg viewBox="0 0 24 24" className="icon-sun" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
      </button>
      <button
        type="button"
        className="toggle-btn toggle-big"
        aria-pressed={big}
        aria-label="Big type"
        title={big ? 'Big type: on' : 'Big type: off'}
        onClick={toggleBig}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2.5 19 6 10.5 9.5 19M3.9 15.8h4.2" />
          <path d="M11 19l5-13 5 13M13 14.2h6" />
        </svg>
      </button>
    </div>
  );
}
