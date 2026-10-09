'use client';

import {
  AGE_CHIPS,
  SIZE_OPTIONS,
  matchesAge,
  matchesSize,
  needsKit,
} from '@/lib/filters';
import type { Item } from '@/lib/types';

/**
 * The extra filters under "More filters", shared by the book and the planner:
 * who it is for, how many people it needs, and whether it needs kit. Each only
 * appears where the items it would filter carry the data.
 */
export interface ExtraFilters {
  age: string;
  size: string;
  noKit: boolean;
}

export const NO_FILTERS: ExtraFilters = { age: 'all', size: 'all', noKit: false };

export function activeCount(f: ExtraFilters): number {
  return (f.age !== 'all' ? 1 : 0) + (f.size !== 'all' ? 1 : 0) + (f.noKit ? 1 : 0);
}

export function matchesFilters(item: Item, f: ExtraFilters): boolean {
  return (
    matchesAge(item.age, f.age) &&
    matchesSize(item.group_sizes, f.size) &&
    (!f.noKit || !needsKit(item.blocks))
  );
}

export interface Available {
  age: boolean;
  size: boolean;
  kit: boolean;
}

/** Which filters make sense for these items. Kit only when some have a kit list and some do not. */
export function availableFilters(items: Item[]): Available {
  const withKit = items.filter((i) => needsKit(i.blocks)).length;
  return {
    age: items.some((i) => i.age),
    size: items.some((i) => i.group_sizes?.length),
    kit: withKit > 0 && withKit < items.length,
  };
}

export function anyAvailable(a: Available): boolean {
  return a.age || a.size || a.kit;
}

export function MoreFiltersButton({
  open,
  count,
  onToggle,
  controls,
}: {
  open: boolean;
  count: number;
  onToggle: () => void;
  controls: string;
}) {
  return (
    <button
      type="button"
      className="chip chip-more"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
    >
      More filters{count ? ` · ${count}` : ''}
    </button>
  );
}

function Row({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { slug: string; label: string }[];
  value: string;
  onPick: (slug: string) => void;
}) {
  return (
    <div className="chip-group" role="group" aria-label={label}>
      <span className="chip-group-label">{label}</span>
      <div className="chips">
        {[{ slug: 'all', label: 'Any' }, ...options].map((o) => (
          <button
            key={o.slug}
            type="button"
            className="chip"
            aria-pressed={value === o.slug}
            onClick={() => onPick(o.slug)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FilterPanel({
  id,
  available,
  value,
  onChange,
}: {
  id: string;
  available: Available;
  value: ExtraFilters;
  onChange: (patch: Partial<ExtraFilters>) => void;
}) {
  return (
    <div id={id} className="more-filters">
      {available.age ? (
        <Row
          label="Age"
          options={AGE_CHIPS}
          value={value.age}
          onPick={(age) => onChange({ age })}
        />
      ) : null}
      {available.size ? (
        <Row
          label="Group"
          options={SIZE_OPTIONS}
          value={value.size}
          onPick={(size) => onChange({ size })}
        />
      ) : null}
      {available.kit ? (
        <Row
          label="Kit"
          options={[{ slug: 'none', label: 'No kit needed' }]}
          value={value.noKit ? 'none' : 'all'}
          onPick={(slug) => onChange({ noKit: slug === 'none' })}
        />
      ) : null}
    </div>
  );
}
