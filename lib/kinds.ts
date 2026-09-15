import type { Kind } from './types';

/** ["12 songs", "3 skits"]: each section in its own noun, empty ones skipped. */
export function countParts(items: { kind: string }[], kinds: Kind[]): string[] {
  return kinds.flatMap((k) => {
    const n = items.filter((i) => i.kind === k.slug).length;
    return n ? [`${n} ${n === 1 ? k.singular : k.plural}`] : [];
  });
}

/**
 * Whether each section's items sit together, so they can print under a
 * heading per section. A running order that mixes them cannot.
 */
export function sectionsTogether(items: { kind: string }[]): boolean {
  const runs = items.filter((item, i) => i === 0 || items[i - 1].kind !== item.kind).length;
  return runs === new Set(items.map((i) => i.kind)).size;
}

/** Book order: section by section, each in its own running order. */
export function inBookOrder<T extends { kind: string; sort_order: number }>(
  items: T[],
  kinds: Kind[],
): T[] {
  const rank = new Map(kinds.map((k, i) => [k.slug, i]));
  return [...items].sort(
    (a, b) =>
      (rank.get(a.kind) ?? kinds.length) - (rank.get(b.kind) ?? kinds.length) ||
      a.sort_order - b.sort_order,
  );
}
