import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { OfflineSupport } from '@/components/OfflineSupport';
import { ReadingPrefsProvider } from '@/components/ReadingPrefs';
import { Analytics } from '@vercel/analytics/next';
import { BOOK, appName, brand } from '@/lib/brand';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  description: brand.description,
  applicationName: appName,
  // Plain addresses: next.config.mjs sends each to this book's own files.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0D1B2A',
};

/**
 * Applies the saved mode before first paint so a leader who chose daylight
 * mode does not get a faceful of dark blue when the page loads. With nothing
 * saved, each book opens in its own default: night round the fire, day for
 * pioneering, bushcraft and games.
 */
const noFlash = `
try {
  var m = localStorage.getItem('songbook:mode');
  document.documentElement.dataset.mode = (m === 'day' || m === 'night') ? m : '${brand.defaultMode}';
  document.documentElement.dataset.big = localStorage.getItem('songbook:big') === '1' ? '1' : '0';
  document.documentElement.dataset.intro =
    localStorage.getItem('songbook:intro') === 'hidden' ? 'hidden' : 'shown';
} catch (e) {
  document.documentElement.dataset.mode = '${brand.defaultMode}';
  document.documentElement.dataset.intro = 'shown';
}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the script below deliberately rewrites these
    // attributes before React hydrates, so a mismatch here is expected.
    <html
      lang="en-AU"
      data-mode={brand.defaultMode}
      data-book={BOOK}
      data-big="0"
      data-intro="shown"
      className={`${inter.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <OfflineSupport />
        <ReadingPrefsProvider>{children}</ReadingPrefsProvider>
        <Analytics />
      </body>
    </html>
  );
}
