# Campfire Song Book

A ScoutBase campfire songbook: 24 songs for the fire, with night/daylight
reading modes, big type for reading round an actual fire, search across every
lyric, and tag filters.

Songs now live in Postgres rather than in the page, so leaders can edit them and
the public can send new ones in for review.

- **Public songbook** — `/`
- **Submit a song** — `/submit`
- **Admin** — `/admin` (sign in with a one-time email link)

## Stack

- Next.js 16 (App Router) on Vercel
- Supabase Postgres + Supabase Auth
- No service-role key anywhere: see [Security](#security)

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Environment variables:

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable (anon) key — safe in the browser |
| `SUBMISSION_SALT` | Any random string; salts the IP hash used for rate limiting |

## The song format

A song body is stored as a list of **blocks**, not HTML. This is what keeps a
public submission from ever becoming markup on the page.

| Block | Renders as |
| --- | --- |
| `verse` | A verse. Optional `label` shows as a small heading, e.g. "Chorus" |
| `note` | A small italic aside |
| `shout` | A large emphasised line |
| `box` | A bordered panel with a heading and a list |
| `grid` | Like `box`, but laid out in columns |
| `pills` | A row of rounded chips |

Inside any line: `**bold**`, `_italic_`, and a newline is a line break. Nothing
else is interpreted.

Admins type songs as plain text and `lib/blocks.ts` parses it:

```
Campfires burning, campfires burning,
Draw nearer, draw nearer,

Chorus:
The words of the chorus go here.

Note: this becomes a small aside.

- a line starting with a dash
- becomes a list
```

## Database

`supabase/schema.sql` recreates the whole schema. `supabase/seed/songs.sql`
loads the 24 original songs; `supabase/seed/songs.json` is the same content in
the block format, which is the easier one to edit by hand.

Tables: `songs`, `submissions`, `tags`, `admins`.

## Security

The design goal was that a public, anonymously-writable form should be unable to
reach anything it shouldn't, even if application code has a bug.

- **Row level security on every table.** Anon can read published songs and tags.
  That is the entire extent of anonymous access.
- **Anon cannot read or write `submissions` at all** — not even its own. There is
  no anon policy on that table.
- **Submissions go through `submit_song()`**, a `security definer` function.
  Validation, tag checking and the five-per-hour rate limit live inside the
  database, so they hold even if someone calls PostgREST directly rather than
  using the form.
- **No service-role key** is used by the app or stored in Vercel, so there is no
  all-powerful credential to leak.
- **Admin access is an email allowlist** in the `admins` table, checked against
  the verified email in the session — never against anything the browser sends.
  Removing an address takes effect on the next request.
- **Submitter IPs are not stored**, only a salted SHA-256 hash, used solely for
  rate limiting.
- **Nothing is rendered with `dangerouslySetInnerHTML`.** Blocks are rendered as
  React elements, and `sanitizeBlocks()` drops anything unrecognised before it
  reaches the page.

## Adding an admin

Sign in at `/admin`, go to **Admins**, and add their email address. They then
sign in with a one-time link. You cannot remove yourself.
