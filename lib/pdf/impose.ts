import { PDFDocument } from 'pdf-lib';

/**
 * Lay A5 pages out two-up on A4 landscape sheets in saddle-stitch order, so
 * printing double-sided (flip on the short edge), folding the stack in half
 * and stapling the spine gives a booklet that reads in order.
 *
 * A booklet needs a multiple of four pages. The shortfall is made up with
 * blank pages just inside the back cover, so the back cover stays at the back.
 */
export async function imposeBooklet(
  a5: Uint8Array,
  { keepLastPageLast }: { keepLastPageLast: boolean },
): Promise<Uint8Array> {
  const src = await PDFDocument.load(a5);
  const count = src.getPageCount();
  const total = Math.ceil(count / 4) * 4;

  // Reading order, with null for a blank page.
  const order: (number | null)[] = Array.from({ length: count }, (_, i) => i);
  const blanks: null[] = Array(total - count).fill(null);
  if (keepLastPageLast && count > 1) order.splice(count - 1, 0, ...blanks);
  else order.push(...blanks);

  const out = await PDFDocument.create();
  const pages = await out.embedPdf(src, src.getPageIndices());
  const { width, height } = pages[0];

  for (let sheet = 0; sheet < total / 4; sheet += 1) {
    const outer = 2 * sheet;
    // Front of the sheet: the higher page on the left. Back: the reverse.
    const sides: [number, number][] = [
      [total - 1 - outer, outer],
      [outer + 1, total - 2 - outer],
    ];
    for (const [left, right] of sides) {
      const spread = out.addPage([width * 2, height]);
      [left, right].forEach((slot, column) => {
        const index = order[slot];
        if (index !== null) spread.drawPage(pages[index], { x: column * width, y: 0 });
      });
    }
  }

  out.setTitle(src.getTitle() ?? 'ScoutBase Campfire');
  if (src.getAuthor()) out.setAuthor(src.getAuthor()!);
  out.setCreator('ScoutBase Campfire');
  return out.save();
}
