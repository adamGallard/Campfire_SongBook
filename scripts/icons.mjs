// Draws the Campfire Book icon and writes every size the site needs.
//
//   node scripts/icons.mjs
//
// The icon belongs with ScoutBase's (navy and green on white) and SB Leader's
// (white on purple): the same tent, flag and people, drawn in white on the
// book's night navy, with a fire where the middle person would sit.
// sharp comes with Next.js, so there is nothing extra to install.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const NIGHT = '#0D1B2A';
const INK = '#FFFFFF';
const FLAME = '#F59E0B';
const CORE = '#FDE68A';

/**
 * The artwork on a 512 grid. `scale` shrinks it about the centre, for icons a
 * platform crops into a circle. `small` is the favicon cut: at 16–32px the flag,
 * logs and people turn to mush, so it keeps just a heavy tent and the fire.
 */
function art({ scale = 1, small = false }) {
  const floor = 388;
  const person = (cx, r, w) => `
    <circle cx="${cx}" cy="${floor - w * 0.5 - r - 8}" r="${r}" fill="${INK}"/>
    <path d="M${cx - w / 2} ${floor} v-${w * 0.1} a${w / 2} ${w * 0.46} 0 0 1 ${w} 0 v${w * 0.1} z" fill="${INK}"/>`;
  const fire = (s) => `
    <g transform="translate(256 ${floor}) scale(${s})">
      ${small ? '' : `<path d="M-46 -2 L46 -22 M-46 -22 L46 -2" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>`}
      <path d="M0 -150 C18 -122 50 -100 50 -60 C50 -30 28 -10 0 -10 C-28 -10 -50 -30 -50 -60 C-50 -86 -38 -104 -25 -118 C-22 -98 -15 -86 -5 -80 C-10 -106 -10 -128 0 -150 Z" fill="${FLAME}"/>
      <path d="M2 -88 C12 -74 26 -60 26 -42 C26 -24 14 -14 0 -14 C-14 -14 -26 -24 -26 -40 C-26 -56 -10 -68 2 -88 Z" fill="${CORE}"/>
    </g>`;
  const tent = small
    ? `<path d="M132 ${floor} H70 L256 120 L442 ${floor} H380"/>`
    : `<path d="M256 96 L326 122 L256 148"/><path d="M256 96 V214"/>
       <path d="M150 ${floor} H92 L256 176 L420 ${floor} H362"/>`;

  return `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <g fill="none" stroke="${INK}" stroke-width="${small ? 30 : 13}" stroke-linecap="round" stroke-linejoin="round">
      ${tent}
    </g>
    ${small ? '' : person(184, 21, 68) + person(328, 21, 68)}
    ${fire(small ? 1.45 : 0.86)}
  </g>`;
}

/** `rounded` for icons shown as they are; square for ones a platform masks itself. */
function svg({ size = 512, rounded = true, scale = 1, small = false } = {}) {
  const ground = rounded
    ? `<rect width="512" height="512" rx="112" fill="${NIGHT}"/>`
    : `<rect width="512" height="512" fill="${NIGHT}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${ground}${art({ scale, small })}</svg>\n`;
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
write('app/icon.svg', svg({ small: true }));
write(
  'app/favicon.ico',
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png({ size, small: true }) })))),
);

// iOS rounds the corners itself, and fills transparent ones with black.
write('app/apple-icon.png', await png({ size: 180, rounded: false, scale: 0.92 }));

// Android and desktop installs, listed in app/manifest.ts. The maskable one
// keeps the artwork inside the central circle a launcher may crop to.
write('public/icons/icon-192.png', await png({ size: 192 }));
write('public/icons/icon-512.png', await png({ size: 512 }));
write('public/icons/icon-512-maskable.png', await png({ size: 512, rounded: false, scale: 0.78 }));
