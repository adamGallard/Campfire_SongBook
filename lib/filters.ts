import type { Block } from './types';

/**
 * Extra filters on top of a section's tags. A tag says what sort of thing an
 * item is; these say who it is for and how many people it needs, which is how
 * a leader actually picks a game. They are optional: a section whose items
 * have none of them shows no such chips.
 */
export type Age = 'cubs' | 'scouts' | 'both';
export type GroupSize = 'small' | 'patrol' | 'large';

/** "Cubs" matches a game made for Cubs or for both; "Scouts" likewise. */
export const AGE_CHIPS: { slug: Exclude<Age, 'both'>; label: string }[] = [
  { slug: 'cubs', label: 'Cubs' },
  { slug: 'scouts', label: 'Scouts' },
];

export const AGE_OPTIONS: { slug: Age; label: string }[] = [
  { slug: 'cubs', label: 'Cubs' },
  { slug: 'scouts', label: 'Scouts' },
  { slug: 'both', label: 'Cubs and Scouts' },
];

export const SIZE_OPTIONS: { slug: GroupSize; label: string }[] = [
  { slug: 'small', label: '2 to 5' },
  { slug: 'patrol', label: 'Six or Patrol' },
  { slug: 'large', label: 'Whole group' },
];

export function matchesAge(itemAge: Age | null, chip: string): boolean {
  return chip === 'all' || itemAge === chip || itemAge === 'both';
}

/** An item with no sizes set suits any group, so it is never hidden by this filter. */
export function matchesSize(sizes: GroupSize[] | null, chip: string): boolean {
  return chip === 'all' || !sizes?.length || sizes.includes(chip as GroupSize);
}

export function needsKit(blocks: Block[]): boolean {
  return blocks.some((b) => b.type === 'kit');
}
