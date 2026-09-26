// Draws each book's icon and writes every size the site needs.
//
//   node scripts/icons.mjs
//
// The artwork is the ScoutBase design system's filled app icons
// (scoutbase-campfire-filled.svg, scoutbase-pioneering-filled.svg): the master
// mark's tent, pole and pennant in white on the app's colour, with the app's
// glyph where the three figures sit. Keep the geometry as it is here; the
// design system says never to redraw a glyph, and to use the filled icon at
// 32px and below.
//
// Each book's files go in public/icons/<book>/. A deploy serves its own book's
// set at the plain addresses (/icon.svg, /favicon.ico, /icons/icon-192.png…)
// through the rewrites in next.config.mjs.
// sharp comes with Next.js, so there is nothing extra to install.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const INK = '#FFFFFF';

/** The app colour for the tile, and the glyph under the tent, per book. */
const BOOKS = {
  campfire: {
    tile: '#EA580C', // app-campfire
    glyph: (tile) => `
      <g fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round">
        <path d="M-95 -4 L95 -38"/>
        <path d="M-95 -38 L95 -4"/>
      </g>
      <path d="M0 -152 C42 -114 55 -82 44 -55 C36 -37 20 -27 0 -27 C-26 -27 -46 -45 -46 -69 C-46 -91 -32 -105 -22 -125 C-14 -102 -4 -93 8 -98 C17 -117 14 -135 0 -152 Z" fill="${INK}" stroke="${tile}" stroke-width="10" stroke-linejoin="round"/>`,
  },
  pioneering: {
    tile: '#1D4ED8', // app-pioneering
    // A trestle: two uprights and a ledger, square-lashed where they cross.
    glyph: (tile) => `
      <g fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round">
        <path d="M-60 -142 V-4"/>
        <path d="M60 -142 V-4"/>
        <path d="M-122 -72 H122"/>
      </g>
      <g fill="${INK}" stroke="${tile}" stroke-width="8">
        <rect x="-80" y="-95" width="40" height="46" rx="10"/>
        <rect x="40" y="-95" width="40" height="46" rx="10"/>
      </g>
      <g fill="none" stroke="${tile}" stroke-width="6" stroke-linecap="round">
        <path d="M-72 -84 L-48 -60"/>
        <path d="M-72 -60 L-48 -84"/>
        <path d="M48 -84 L72 -60"/>
        <path d="M48 -60 L72 -84"/>
      </g>`,
  },
};

/**
 * The mark on the design system's 100 grid. `scale` shrinks it about the
 * centre, for icons a platform crops into a circle.
 */
function art(book, scale = 1) {
  const { tile, glyph } = BOOKS[book];
  return `
  <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">
    <g transform="translate(49.623 78.339) scale(0.12567)">
      <path d="M5 -448 L96 -412 L10 -379 Z" fill="none" stroke="${INK}" stroke-width="18" stroke-linejoin="round"/>
      <g fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round">
        <path d="M-188 -9 L-265 -9 L0 -353 L265 -9 L186 -9"/>
        <path d="M0 -441 V-169"/>
      </g>${glyph(tile)}
    </g>
  </g>`;
}

/** `rounded` for icons shown as they are; square for ones a platform masks itself. */
function svg({ book, size = 512, rounded = true, scale = 1 }) {
  const { tile } = BOOKS[book];
  const ground = rounded
    ? `<rect width="100" height="100" rx="23" fill="${tile}"/>`
    : `<rect width="100" height="100" fill="${tile}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${ground}${art(book, scale)}</svg>\n`;
}

const png = (options) => sharp(Buffer.from(svg(options))).png().toBuffer();

/** An .ico is a directory of images; modern ones may simply hold PNGs. */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, at);
    header.writeUInt8(size >= 256 ? 0 : size, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.data)]);
}

function write(path, data) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  console.log(path);
}

for (const book of Object.keys(BOOKS)) {
  const dir = `public/icons/${book}`;

  // Browser tabs: the layout links /icon.svg and /favicon.ico.
  write(`${dir}/icon.svg`, svg({ book }));
  write(
    `${dir}/favicon.ico`,
    ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png({ book, size }) })))),
  );

  // iOS rounds the corners itself, and fills transparent ones with black. The
  // mark already leaves room for the corners, so it goes in at full size.
  write(`${dir}/apple-icon.png`, await png({ book, size: 180, rounded: false }));

  // Android and desktop installs, listed in app/manifest.ts. The maskable one
  // keeps the artwork inside the central circle a launcher may crop to.
  write(`${dir}/icon-192.png`, await png({ book, size: 192 }));
  write(`${dir}/icon-512.png`, await png({ book, size: 512 }));
  write(`${dir}/icon-512-maskable.png`, await png({ book, size: 512, rounded: false, scale: 0.84 }));
}
