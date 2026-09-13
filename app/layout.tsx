import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { ReadingPrefsProvider } from '@/components/ReadingPrefs';
import { Analytics } from '@vercel/analytics/next';
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
  title: 'Campfire Song Book',
  description:
    'Songs for the fire — search for one, or scroll from the loud ones at the top to the quiet ones at the end.',
};

export const viewport: Viewport = {
  themeColor: '#0D1B2A',
};

/**
 * Applies the saved mode before first paint so a leader who chose daylight
 * mode does not get a faceful of dark blue when the page loads.
 */
const noFlash = `
try {
  var m = localStorage.getItem('songbook:mode');
  document.documentElement.dataset.mode = (m === 'day' || m === 'night') ? m : 'night';
  document.documentElement.dataset.big = localStorage.getItem('songbook:big') === '1' ? '1' : '0';
  document.documentElement.dataset.intro =
    localStorage.getItem('songbook:intro') === 'hidden' ? 'hidden' : 'shown';
} catch (e) {
  document.documentElement.dataset.mode = 'night';
  document.documentElement.dataset.intro = 'shown';
}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the script below deliberately rewrites these
    // attributes before React hydrates, so a mismatch here is expected.
    <html
      lang="en-AU"
      data-mode="night"
      data-big="0"
      data-intro="shown"
      className={`${inter.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <ReadingPrefsProvider>{children}</ReadingPrefsProvider>
        <Analytics />
      </body>
    </html>
  );
}
