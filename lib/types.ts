/**
 * An item body is a list of blocks rather than HTML. Public submissions flow
 * into the same shape, so nothing a stranger types is ever rendered as markup.
 *
 * Inline markup inside `text`/`items`/`label` is deliberately tiny:
 *   **bold**   a speaker name, a shouted word, a cue
 *   _italic_   a stage direction
 *   newline    a line break within the block
 */
export type Block =
  | { type: 'verse'; text: string; label?: string }
  | { type: 'note'; text: string }
  | { type: 'shout'; text: string }
  | { type: 'box'; heading?: string | null; items: string[] }
  | { type: 'grid'; heading?: string | null; items: string[] }
  | { type: 'pills'; items: string[] };

export type BlockType = Block['type'];

/** A section of the book: songs, skits, yarns, applause. */
export interface Kind {
  slug: string;
  /** Section name on the switcher: "Songs". */
  label: string;
  /** Second line of the hero: "Song Book", "Applause". */
  heading: string;
  /** The noun a leader uses: "song", "skit", "cheer". */
  singular: string;
  plural: string;
  lede: string | null;
  sort_order: number;
  enabled: boolean;
}

/** Tags are scoped per kind — "Loud" means nothing to a skit. */
export interface Tag {
  kind: string;
  slug: string;
  label: string;
  sort_order: number;
}

export interface Item {
  id: string;
  slug: string;
  title: string;
  kind: string;
  tag: string;
  /** The small uppercase line above the title. */
  category_label: string | null;
  /** The italic line under the title: a tune for songs, a cast list for skits. */
  tune: string | null;
  blocks: Block[];
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Submission {
  id: string;
  title: string;
  kind: string;
  tag: string | null;
  tune: string | null;
  body: string;
  submitter_name: string | null;
  submitter_email: string | null;
  submitter_note: string | null;
  status: SubmissionStatus;
  review_note: string | null;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  published_song_id: string | null;
  created_at: string;
}
