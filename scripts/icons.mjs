// Draws the ScoutBase Campfire icon and writes every size the site needs.
//
//   node scripts/icons.mjs
//
// The artwork is the ScoutBase design system's filled Campfire icon
// (scoutbase-campfire-filled.svg): the master mark's tent, pole and pennant in
// white on an app-campfire tile, with a flame on crossed logs where the three
// figures sit. Keep the geometry as it is here; the design system says never to
// redraw a glyph, and to use this filled icon at 32px and below.
// sharp comes with Next.js, so there is nothing extra to install.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const TILE = '#EA580C'; // app-campfire
const INK = '#FFFFFF';

/**
 * The mark on the design system's 100 grid. `scale` shrinks it about the
 * centre, for icons a platform crops into a circle.
 */
function art(scale = 1) {
  return `
  <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">
    <g transform="translate(49.623 78.339) scale(0.12567)">
      <path d="M5 -448 L96 -412 L10 -379 Z" fill="none" stroke="${INK}" stroke-width="18" stroke-linejoin="round"/>
      <g fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round">
        <path d="M-188 -9 L-265 -9 L0 -353 L265 -9 L186 -9"/>
        <path d="M0 -441 V-169"/>
      </g>
      <g fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round">
        <path d="M-95 -4 L95 -38"/>
        <path d="M-95 -38 L95 -4"/>
      </g>
      <path d="M0 -152 C42 -114 55 -82 44 -55 C36 -37 20 -27 0 -27 C-26 -27 -46 -45 -46 -69 C-46 -91 -32 -105 -22 -125 C-14 -102 -4 -93 8 -98 C17 -117 14 -135 0 -152 Z" fill="${INK}" stroke="${TILE}" stroke-width="10" stroke-linejoin="round"/>
    </g>
  </g>`;
}

/** `rounded` for icons shown as they are; square for ones a platform masks itself. */
function svg({ size = 512, rounded = true, scale = 1 } = {}) {
  const ground = rounded
    ? `<rect width="100" height="100" rx="23" fill="${TILE}"/>`
    : `<rect width="100" height="100" fill="${TILE}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${ground}${art(scale)}</svg>\n`;
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

// Browser tabs: Next.js links app/icon.svg and app/favicon.ico automatically.
write('app/icon.svg', svg());
write(
  'app/favicon.ico',
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png({ size }) })))),
);

// iOS rounds the corners itself, and fills transparent ones with black. The
// mark already leaves room for the corners, so it goes in at full size.
write('app/apple-icon.png', await png({ size: 180, rounded: false }));

// Android and desktop installs, listed in app/manifest.ts. The maskable one
// keeps the artwork inside the central circle a launcher may crop to.
write('public/icons/icon-192.png', await png({ size: 192 }));
write('public/icons/icon-512.png', await png({ size: 512 }));
write('public/icons/icon-512-maskable.png', await png({ size: 512, rounded: false, scale: 0.84 }));
