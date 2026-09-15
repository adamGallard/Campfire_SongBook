import type { MetadataRoute } from 'next';

/**
 * Lets the book be added to a home screen and open like an app, full screen
 * and in night colours. Icons are drawn by scripts/icons.mjs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Campfire Book',
    short_name: 'Campfire',
    description: 'Songs, skits, yarns and cheers for the campfire, readable round a real fire.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0D1B2A',
    theme_color: '#0D1B2A',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
