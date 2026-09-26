import type { MetadataRoute } from 'next';
import { appName, brand } from '@/lib/brand';

/**
 * Lets the book be added to a home screen and open like an app, full screen.
 * Icons are drawn by scripts/icons.mjs; next.config.mjs serves this book's set
 * at the addresses below.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: appName,
    // Fits under a home-screen icon, and matches SB Leader.
    short_name: brand.shortName,
    description: brand.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: brand.background,
    theme_color: '#0D1B2A',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
