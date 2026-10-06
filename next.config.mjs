// Which book this deploy is; see lib/brand.ts.
const book = ['pioneering', 'bushcraft'].includes(process.env.NEXT_PUBLIC_BOOK)
  ? process.env.NEXT_PUBLIC_BOOK
  : 'campfire';

/**
 * Each book's icons and offline notice live in their own folder, but every
 * page, the manifest and the service worker ask for them at one plain address.
 * These send each address to this deploy's book, before the public folder is
 * checked, so there is nothing to keep in step per book.
 */
const perBook = [
  ['/icon.svg', `/icons/${book}/icon.svg`],
  ['/favicon.ico', `/icons/${book}/favicon.ico`],
  ['/apple-icon.png', `/icons/${book}/apple-icon.png`],
  ['/icons/icon-192.png', `/icons/${book}/icon-192.png`],
  ['/icons/icon-512.png', `/icons/${book}/icon-512.png`],
  ['/icons/icon-512-maskable.png', `/icons/${book}/icon-512-maskable.png`],
  ['/offline.html', `/offline/${book}.html`],
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return {
      beforeFiles: perBook.map(([source, destination]) => ({ source, destination })),
    };
  },

  // When Supabase rejects an email link's redirect it falls back to the Site
  // URL, so the link lands on the home page, which ignores it. Send those on to
  // the callback (the query passes through) instead of silently dropping them.
  async redirects() {
    return [
      ...['code', 'error_description'].map((key) => ({
        source: '/',
        has: [{ type: 'query', key }],
        destination: '/auth/callback?next=/admin/account',
        permanent: false,
      })),
      // The planner was "Make a PDF" at /export; keep old links and bookmarks working.
      { source: '/export', destination: '/plan', permanent: true },
    ];
  },
};

export default nextConfig;
