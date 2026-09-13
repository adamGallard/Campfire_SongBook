import type { Kind } from './types';

/** ["12 songs", "3 skits"]: each section in its own noun, empty ones skipped. */
export function countParts(items: { kind: string }[], kinds: Kind[]): string[] {
  return kinds.flatMap((k) => {
    const n = items.filter((i) => i.kind === k.slug).length;
    return n ? [`${n} ${n === 1 ? k.singular : k.plural}`] : [];
  });
}
