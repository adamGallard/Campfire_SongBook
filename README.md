# ScoutBase Campfire, Pioneering and Bushcraft

One codebase and one database, three books:

- **ScoutBase Campfire** — songs, skits, yarns and applause, read round a fire.
- **ScoutBase Pioneering** — knots, lashings, builds and camp gadgets, step by
  step, with kit lists and safety checks. Daylight by default, in Pioneering
  blue, at `pioneering.scoutbase.app`.
- **ScoutBase Bushcraft** — fire lighting without matches, and in time the rest
  of living well in the bush, in the same step-by-step style. Daylight by
  default, in Bushcraft brown, at `bushcraft.scoutbase.app`.

Each book is its own Vercel project deploying this repo, told apart by
`NEXT_PUBLIC_BOOK` (see [The books](#the-books)). Everything below applies to
both unless it says otherwise.

A campfire book for Scout groups: songs, skits, yarns and applause cheers,
with night/daylight reading modes and big type for reading round an actual fire
(the moon and Aa buttons at the top right of every page), search across every
line, filters that change per section, and a book that keeps working with no
signal. It sits alongside ScoutBase and SB Leader, and on a home screen it is
"SB Campfire". Every footer links to the other books (each book's `url` and
`blurb` are in `lib/brand.ts`) and points back to
[www.scoutbase.app](https://www.scoutbase.app) for anyone curious about the other
ScoutBase tools.

Everything lives in Postgres rather than in the page, so leaders can edit it and
the public can send new material in for review.

Sections are rows in the `kinds` table, and each one carries its own wording —
the hero title under the ScoutBase Campfire brand ("Song Book", "Yarns"), and
the noun a leader actually uses ("song", "skit",
"yarn", "cheer"), so no copy is derived from the section name. Adding a section
is a row plus its tags, and an entry in the `WORDING` tables of the submission
and admin forms (what the tune line and the body are called — a skit has a
cast and a script, a yarn has "How to tell it" and a story). A new section
goes in with `enabled = false`, which keeps it out of the book and the
submission form until its first items have been checked. The whole book ships
in one page load, so switching section needs no signal.

- **The book** — `/` (opens straight into the songs; an intro panel explains
  the site to a first-time visitor and collapses once dismissed)
- **Plan a campfire** — `/plan` (tick any mix of songs, skits, yarns and cheers,
  put them in a running order, print A4 pages or an A5 booklet; each section,
  and the print options, fold away. `/export`, its old address, redirects here)
- **Send one in** — `/submit?kind=song|skit|yarn|applause`
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
| `NEXT_PUBLIC_BOOK` | `campfire` (the default when unset), `pioneering` or `bushcraft` |

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

## The books

`lib/brand.ts` holds everything that differs between the books: the name,
the wording, the default reading mode and the PDF cover. Sections belong to a
book in the database (`kinds.book`), so each site shows, plans, takes
submissions for and administers only its own book's sections. The admin list
is shared: one login manages them all, each on its own site.

The accent colour follows the book: the layout puts `data-book` on `<html>`,
and `app/globals.css` sets the `--app-*` tokens from the ScoutBase design
system for it (`app-campfire…`, `app-pioneering…`, `app-bushcraft…`).

Icons and the offline notice live per book in `public/icons/<book>/` and
`public/offline/<book>.html`, and `next.config.mjs` serves this deploy's set at
the plain addresses (`/icon.svg`, `/favicon.ico`, `/icons/icon-192.png`,
`/offline.html`), so the manifest and service worker are the same for both.

### Setting up the Pioneering site

1. Apply `supabase/migrations/20260926_add_books.sql` to the shared database
   **before** deploying this code: the pages read `kinds.book` at build time.
   It is safe on the live Campfire site, which keeps working unchanged.
2. Load `supabase/seed/pioneering.sql`. Its sections are switched off, so
   nothing shows until a section is switched on
   (`update public.kinds set enabled = true where slug = 'knot';`).
3. In Vercel, add a second project from this repo with the same three
   variables as Campfire plus `NEXT_PUBLIC_BOOK=pioneering`, and add the domain
   `pioneering.scoutbase.app`.
4. In Cloudflare DNS, add a `CNAME` named `pioneering` pointing at the target
   Vercel shows, with the proxy **off** (DNS only), so Vercel can issue the
   certificate.
5. In Supabase → Authentication → URL Configuration, add
   `https://pioneering.scoutbase.app/**` under Redirect URLs.
6. Apply `supabase/migrations/20261006_add_watch_url.sql` **before** deploying
   the code that adds "Watch it tied": every book asks for `items.watch_url` by
   name, and the page will not load without it. Re-running
   `supabase/seed/pioneering.sql` then fills in every starter knot and
   lashing's link; new ones go in **Animation link** in the admin. Animated Knots
   have said yes to us linking to them; link only, never copy their
   animations, pictures or words in.

### Setting up the Bushcraft site

The same steps as Pioneering, for the third book:

1. Apply `supabase/migrations/20261006_add_bushcraft.sql` to the shared
   database. It adds the book and its first section, **Fire**, switched off;
   nothing on the other two sites changes.
2. Load `supabase/seed/bushcraft.sql`: eight pages (fire safety; tinder,
   kindling and fuel; the bow drill, hand drill, fire plough, fire saw and pump
   drill; flint and steel), from the Fire Starter Guide by Ben Maden (Baloo),
   Belmont Scouts, and credited on each page. Have someone who teaches fire
   lighting check them, then
   `update public.kinds set enabled = true where slug = 'fire';`.
3. In Vercel, add a third project from this repo with the same three variables
   plus `NEXT_PUBLIC_BOOK=bushcraft`, and the domain `bushcraft.scoutbase.app`.
4. In Cloudflare DNS, a `CNAME` named `bushcraft` to the target Vercel shows,
   proxy **off**.
5. In Supabase → Authentication → URL Configuration, add
   `https://bushcraft.scoutbase.app/**` under Redirect URLs.

More sections (shelters, water, tools…) are a row in `kinds` and their tags,
plus a `WORDING` entry in `app/submit/SubmitForm.tsx`, as for any section.

## Offline

The book is used round a fire, often with no signal, so it keeps working
without a connection once it has been opened on a device.

`public/sw.js` is a hand-written service worker, registered by
`components/OfflineSupport.tsx` in production builds only (development build
files are not content-hashed, so a cache-first worker would serve stale code).

- **The book (`/`) and the campfire planner (`/plan`)** are saved together with
  every script, stylesheet, web font and image they refer to, found by reading
  the saved HTML and CSS. A saved page still searches, filters and switches
  section. With signal, pages come from the network and refresh the saved
  copy; if the network takes more than four seconds (one bar), the saved copy
  is shown and the fresh one saved when it arrives.
- **`/submit`** needs a connection anyway; offline it shows `public/offline.html`.
- **Admin, sign-in and every non-GET request** are never intercepted or saved.
- **Printing a PDF** works offline if one has been made on that device before:
  its ~600 KB of code is still only fetched when someone presses Download.

A banner says when the phone reports no connection. Bump `VERSION` in `sw.js`
when its behaviour changes; activating clears the old caches. Build files no
saved page refers to are cleared once they are 30 days old.

To test locally: `npx next build`, `npx next start -p 3001`, open the site once,
then stop the server and reload.

## Icon

Each book's icon is its filled icon from the ScoutBase design system: the
master mark's tent, pole and pennant in white on the app colour, with the
app's glyph where the three figures sit. Campfire is a flame on crossed logs
on Campfire orange (`app-campfire`, #EA580C); Pioneering is a trestle with
square lashings on Pioneering blue (`app-pioneering`, #1D4ED8); Bushcraft is an
axe bitten into a log on Bushcraft brown (`app-bushcraft`, #7C4A1E). The same
drawing is used at every size, favicons included, as the design system asks.

`scripts/icons.mjs` draws them all and writes every size into `public/icons/<book>/`:
`icon.svg` and `favicon.ico` for browser tabs, `apple-icon.png` for iPhone home
screens, and the `icon-*.png` files for Android and desktop installs, which
`app/manifest.ts` lists. Run `node scripts/icons.mjs` after changing a drawing;
`sharp` comes with Next.js.

## The block format

An item's body is stored as a list of **blocks**, not HTML. This is what keeps a
public submission from ever becoming markup on the page.

| Block | Written as | Renders as |
| --- | --- | --- |
| `verse` | plain text | A verse. `Chorus:` on its own line labels it |
| `note` | `Note: …` | A small italic aside |
| `shout` | `Punchline: …` | A large bold line — a skit's payoff, a yarn's jump |
| `box` | `Heading:` + `- ` lines | A bordered panel with a list |
| `grid` | `Heading [columns]:` + `- ` lines | Like `box`, in columns |
| `pills` | `[chips]:` + `- ` lines | A row of rounded chips |
| `steps` | lines numbered `1.`, `2.`, under an optional `Heading:` | Numbered steps to follow |
| `kit` | `Kit:` + `- 2 × Spars, 2.4 m` lines | A kit list; each count is stored apart, so a plan can add kit up |
| `safety` | `Safety:` + `- ` lines | A warning panel of things to check first |

The three pioneering blocks also take a `[steps]`, `[kit]` or `[safety]`
marker after any other heading (`Legs [kit]:`), which is how an unusual
heading survives the editor.

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

## Diagrams

Step drawings and build drawings live in `lib/diagrams.ts` as data: spars,
rope paths, arrows, labels, lettered markers, and plain solids such as a bowl. `components/Diagram.tsx` draws
them on the page in the book's colours, following day and night mode, and
`lib/pdf/diagram.tsx` prints the same geometry in ink.

Drawings are keyed by an item's slug. Each step drawing records the words of
the step it shows (`step`), and a steps block only gets drawings while every
step still reads as recorded, in the same order. Rewording, reordering, adding
or removing a step in admin hides the drawings rather than leave one beside the
wrong instruction; redraw and update `step` to bring them back. A build can
also have an overview drawing with a legend, shown after its opening sentence.

The drawings themselves are in `lib/drawings/`: `knots.ts`, `lashings.ts` and
`builds.ts`, with `parts.ts` for pieces used more than once (the clove hitch
that starts and finishes most lashings). Every starter knot and lashing has
step drawings, as do the A-frame (which also has an overview) and the
wash-bowl stand. Rope that passes behind a spar
is dashed; where two ropes, or a rope's two ends, need telling apart, the
second is drawn in grey-blue (`tone: 'b'`), grey in print.

## Planning and printing

`/plan` lists the whole book as a checklist. The PDF is laid out **in the
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

`supabase/schema.sql` recreates the whole schema, and changes since it was
first written are also kept as files in `supabase/migrations`. Each section has
a seed in `supabase/seed` — `songs`, `skits`, `yarns` and `applause`, and
`pioneering` and `bushcraft` for those whole books — as a `.sql` file to load and a
`.json` file with the same content in the block format, which is the easier
one to edit by hand.

Tables: `books`, `kinds`, `tags`, `items`, `submissions`, `admins`.

`submit_song()` takes the book the form was on, and files a submission only
under a switched-on section of that book; a book with none switched on refuses
it.

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
