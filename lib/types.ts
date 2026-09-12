/**
 * A song body is a list of blocks rather than HTML. Public submissions flow
 * into the same shape, so nothing a stranger types is ever rendered as markup.
 *
 * Inline markup inside `text`/`items`/`label` is deliberately tiny:
 *   **bold**   a shouted word or a cue
 *   _italic_   a stage direction
 *   newline    a line break within the verse
 */
export type Block =
  | { type: 'verse'; text: string; label?: string }
  | { type: 'note'; text: string }
  | { type: 'shout'; text: string }
  | { type: 'box'; heading?: string | null; items: string[] }
  | { type: 'grid'; heading?: string | null; items: string[] }
  | { type: 'pills'; items: string[] };

export type BlockType = Block['type'];

export interface Tag {
  slug: string;
  label: string;
  sort_order: number;
}

export interface Song {
  id: string;
  slug: string;
  title: string;
  tag: string;
  category_label: string | null;
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
