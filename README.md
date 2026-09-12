# Campfire Book

A ScoutBase campfire book: 24 songs and 35 skits, with night/daylight reading
modes, big type for reading round an actual fire, search across every line, and
filters that change per section.

Everything lives in Postgres rather than in the page, so leaders can edit it and
the public can send new material in for review.

Sections are rows in the `kinds` table — songs, skits, and applause (switched
off until there is content for it). The whole book ships in one page load, so
switching section needs no signal.

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

## Deploying

The Vercel project is linked to this repo, so a push to `main` deploys.

Set all three environment variables in **Vercel → Settings → Environment
Variables** for the Production environment *before* the first deploy. The home
page is statically prerendered, which means it reads the database **at build
time** — a missing `NEXT_PUBLIC_SUPABASE_URL` fails the build outright with
`supabaseUrl is required` rather than deploying a broken page. That is
deliberate: a misconfigured songbook should not ship.

Then, in **Supabase → Authentication → URL Configuration**, add the production
origin plus `/auth/callback` to the redirect allowlist, or admin magic links
will refuse to come back.

## The song format

A song body is stored as a list of **blocks**, not HTML. This is what keeps a
public submission from ever becoming markup on the page.

| Block | Written as | Renders as |
| --- | --- | --- |
| `verse` | plain text | A verse. `Chorus:` on its own line labels it |
| `note` | `Note: …` | A small italic aside |
| `shout` | `Punchline: …` | A large bold line — a skit's payoff |
| `box` | `Heading:` + `- ` lines | A bordered panel with a list |
| `grid` | `Heading [columns]:` + `- ` lines | Like `box`, in columns |
| `pills` | `[chips]:` + `- ` lines | A row of rounded chips |

Inside any line: `**bold**` (a speaker name, a cue), `_italic_` (a stage
direction), and a newline is a line break. Nothing else is interpreted.

Every block type round-trips through the plain-text editor, so editing an item
in admin never silently flattens its layout.

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

## Admin access

Sign-in is **email and password** via Supabase Auth. Magic links were dropped
because the free tier's built-in mail quota is a few messages an hour, which is
not enough to sign in reliably.

Two tables decide access, and they are separate on purpose:

- **`admins`** — the allowlist. This alone decides who can manage the songbook.
- **Supabase Auth** — accounts and passwords. Having an account grants nothing.

So an account that is not on the allowlist can sign in and still see only
"Not an admin".

**Adding an admin**: sign in, go to **Admins**, add their address. They then use
**First time here?** on the sign-in page to choose their own password — that
flow refuses any address not already on the allowlist, so strangers cannot
register. You cannot remove yourself.

**Changing your password**: **Account** in the admin bar. Uses the active
session, so it sends no email and works even with the mail quota exhausted.

**Forgot password** does send an email, so it is subject to that quota. For
this to work without email at all, turn **Confirm email** off in
*Supabase → Authentication → Providers → Email*: the allowlist, not email
ownership, is what gates access here.

Worth enabling now that passwords are in play: **leaked password protection**
in *Supabase → Authentication → Policies*, which checks new passwords against
HaveIBeenPwned.
