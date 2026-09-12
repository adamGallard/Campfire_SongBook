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

/** The two pill buttons that sit in the hero. */
export function ReadingToggles() {
  const { mode, big, toggleMode, toggleBig } = useReadingPrefs();

  return (
    <>
      <button type="button" className="ghost-btn" onClick={toggleMode}>
        {mode === 'night' ? 'Night mode' : 'Daylight mode'}
      </button>
      <button type="button" className="ghost-btn" onClick={toggleBig}>
        Big type · {big ? 'on' : 'off'}
      </button>
    </>
  );
}
