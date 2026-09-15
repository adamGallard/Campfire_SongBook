# Campfire Book

A ScoutBase campfire book: 24 songs, 35 skits and 16 applause cheers, with
night/daylight reading modes, big type for reading round an actual fire, search
across every line, and filters that change per section.

Everything lives in Postgres rather than in the page, so leaders can edit it and
the public can send new material in for review.

Sections are rows in the `kinds` table, and each one carries its own wording —
the hero heading, and the noun a leader actually uses ("song", "skit",
"cheer"), so no copy is derived from the section name. Adding a fourth section
is a row plus its tags. The whole book ships in one page load, so switching
section needs no signal.

- **The book** — `/` (opens straight into the songs; an intro panel explains
  the site to a first-time visitor and collapses once dismissed)
- **Make a PDF** — `/export` (tick any mix of songs, skits and cheers, put them
  in a running order; download A4 pages or an A5 booklet)
- **Send one in** — `/submit?kind=song|skit|applause`
- **Admin** — `/admin` (sign in with email and password)

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

Then, in **Supabase → Authentication → URL Configuration**, set **Site URL** to
the production origin — `https://`, not `http://` — and add
`https://<your-domain>/**` under **Redirect URLs**. Supabase only honours an
email link's redirect when it matches the Site URL's scheme and host or an
allowlist pattern, and a pattern with no `**` does not match
`/auth/callback?next=…`. Anything that fails that check is silently sent to the
Site URL instead, so a password-reset link just opens the home page.
(`next.config.mjs` forwards a code that lands there to `/auth/callback` as a
fallback, but get the settings right.)

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

## PDF export

`/export` lists the whole book as a checklist. The PDF is laid out **in the
browser** (`@react-pdf/renderer`), so there is no server endpoint doing heavy
work for anonymous visitors, and the ~600 KB of PDF code is only fetched when
someone presses Download. The selection and options are remembered per device.

- **A4 pages** — portrait, type a fifth larger than the booklet.
- **A5 booklet** — half-A4 pages imposed two-up on A4 landscape sheets in
  saddle-stitch order (`lib/pdf/impose.ts`, using `pdf-lib`). Print
  double-sided, flip on the short edge, fold the stack and staple. Blank pages
  needed to reach a multiple of four go just inside the back cover.

Page breaks cannot be known before layout, so `lib/pdf/build.tsx` lays the
selection out up to three times: once with every item on its own page to learn
which fit on one page (those are then never split); again in slightly smaller
type for any that ran over, so a song that is a few lines too long still fits;
then for real, which also gives the contents page its page numbers.

Items print numbered through, with a cover, a two-column contents page and, on
a booklet, a back cover. The PDF uses the same inline markup parser as the page
(`inlineRuns` in `lib/blocks.ts`).

**Running order.** Ticked items start in book order. Moving one (arrow
buttons, or dragging with a mouse) switches the export to the leader's own
order, and anything ticked after that goes on the end; **Put back in book
order** undoes it. While each section stays together the PDF prints a heading
per section. Once they are mixed it cannot, so each item's label names its
section instead ("Skit · 2–3 scouts"). The running order is part of the
selection remembered on the device.

Fonts are self-hosted in `public/fonts` (Inter and Poppins, SIL OFL — licences
alongside). Each has a latin-ext fallback so macrons and other accents print.

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
