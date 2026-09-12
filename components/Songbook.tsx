'use client';

import { useMemo, useState } from 'react';
import { Blocks } from './Blocks';
import { blocksToPlainText } from '@/lib/blocks';
import type { Song, Tag } from '@/lib/types';

export function Songbook({ songs, tags }: { songs: Song[]; tags: Tag[] }) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('all');

  // Search covers the title, the tune line and every lyric, as it did before.
  const haystacks = useMemo(
    () =>
      new Map(
        songs.map((s) => [
          s.id,
          `${s.title} ${s.category_label ?? ''} ${s.tune ?? ''} ${blocksToPlainText(s.blocks)}`.toLowerCase(),
        ]),
      ),
    [songs],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return songs.filter((s) => {
      const matchTag = tag === 'all' || s.tag === tag;
      const matchQuery = !q || (haystacks.get(s.id) ?? '').includes(q);
      return matchTag && matchQuery;
    });
  }, [songs, query, tag, haystacks]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const s of songs) c.set(s.tag, (c.get(s.tag) ?? 0) + 1);
    return c;
  }, [songs]);

  return (
    <>
      <div className="searchbar">
        <div className="wrap">
          <input
            className="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a song or a line of lyrics…"
            aria-label="Search songs"
          />
          <div className="chips" role="group" aria-label="Filter by kind">
            <button
              type="button"
              className="chip"
              aria-pressed={tag === 'all'}
              onClick={() => setTag('all')}
            >
              All {songs.length}
            </button>
            {tags.map((t) => (
              <button
                key={t.slug}
                type="button"
                className="chip"
                aria-pressed={tag === t.slug}
                onClick={() => setTag(t.slug)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="wrap list">
        {visible.length === 0 ? (
          <p className="empty">No song matches that. Try a shorter word.</p>
        ) : (
          visible.map((song, i) => (
            <article className="card" key={song.id} id={song.slug}>
              <div className="card-head">
                <span className="num">{i + 1}</span>
                <span className="pill">{song.category_label ?? song.tag}</span>
              </div>
              <h2>{song.title}</h2>
              {song.tune ? <p className="tune">{song.tune}</p> : null}
              <div className="lyrics">
                <Blocks blocks={song.blocks} />
              </div>
            </article>
          ))
        )}
      </main>
    </>
  );
}
