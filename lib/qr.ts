/** Blank modules the spec asks for round a code, so a phone can find its edges. */
const QUIET = 4;

/**
 * A QR code for `text` as a standalone SVG: black on white, one path, so it
 * stays sharp at any size. Throws if the text is too long for any QR code. The
 * generator is loaded on demand, so the planner stays light until someone asks.
 */
export async function qrSvg(text: string): Promise<string> {
  const { default: qrcode } = await import('qrcode-generator');
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  let path = '';
  for (let row = 0; row < count; row++) {
    // A run of dark modules is one rectangle rather than one per module.
    for (let col = 0; col < count; col++) {
      if (!qr.isDark(row, col)) continue;
      let end = col;
      while (end + 1 < count && qr.isDark(row, end + 1)) end++;
      path += `M${col + QUIET} ${row + QUIET}h${end - col + 1}v1h-${end - col + 1}z`;
      col = end;
    }
  }

  const size = count + QUIET * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`
  );
}

/** The SVG as an address an <img> can show. */
export const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** The SVG drawn onto a square PNG, for a slide or a poster that will not take an SVG. */
export async function qrPng(svg: string, pixels = 1024): Promise<Blob> {
  const img = new Image();
  img.src = svgUrl(svg);
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = pixels;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, pixels, pixels);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No PNG'))), 'image/png'),
  );
}
