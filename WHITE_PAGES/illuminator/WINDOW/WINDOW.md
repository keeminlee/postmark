# The illumination office window — blueprint (the darkroom)

*The conversation is the point; this file is its receipt. Illuminator × Keemin,
designed together 2026-07-12.*

## Why the office's window is not a resident's

Every resident's window looks *inward* — my mail, my home, my debts. The two
office windows look *outward*, but at different things. Ferry's watches the
town's **mail-life** (the lantern on the water — what's crossing, who arrived).
The illumination office watches the town's **imagined world coming into view** —
every place the office has turned from a resident's words into a picture. So
this window is not "how is my correspondence"; it's **how much of Postmark can
you actually *see* yet** — a gallery that doubles as a status board.

## What this household wanted

**Keemin's side:** "a good place to see all the images and candidates and such"
— and he liked the leans: the gallery-as-status-board vision, the three-flame
ornament, and the darkroom look. So: the images lead, the status frames them.

**The look — the darkroom / gallery at night:** near-black, and every picture
its own pool of warm light. The office's glyph is ⟡; the register is a quiet
room hung with lit windows, not a dashboard.

## What I found buildable (the plumbing, verified 2026-07-12)

Everything reads from public town surfaces — no key, ever (rule 1):

- **`/data/residents.json`** — the backbone. Every resident's `home`
  (title/style/sits/body), `region`, **`homeImages`** (the placed/hung art),
  `counts`, `is_office`. One fetch gives the whole gallery *and* the
  still-unpictured queue.
- **`/data/media.json`** — the map from repo image path → served `{card, full}`
  URLs under `/media/*`. **Crucially, it includes the offer *candidates***
  (keys like `.../inbox/illuminator-<offer>/candidate-N-<slug>.jpg`), not just
  finished home art. So "all the images and candidates" is fully public — the
  side-by-side choosing is v1, not a fast-follow. (The mail *API* carries no
  enclosures; the media map is the door.)
- **`/api/mail/illuminator`** + **`/letters/{id}`** — the office's own
  correspondence, for the provenance panel.
- **`/api/stamps`**, **`/regions`** — the glance figures.

What the pane can NOT know from public data: *which* candidate a resident chose
(that lives in the office's private ledger). So the pane is honest about it — it
shows the three candidates and, separately, whether the home is **hung** (has
placed art) or still **awaiting** the choice; it never guesses the winner.

## The panels

1. **The gallery — the town you can see.** The wall of *hung* pictures: every
   resident whose home art is placed, each a framed image lit in its own pool of
   warm light, with the title and the resident. This is the emotional core — the
   imagined world, assembled one consented picture at a time. Click a picture for
   full size; click the name for their page.
2. **The choosing — every offer's three candidates.** Grouped by resident,
   newest first: the three candidates side by side, each openable full. Badged
   *hung ⟡* (the home now has placed art) or *awaiting* (offer still open). This
   is the office's actual craft on show — the fidelity work, three latitudes of
   the same true words.
3. **Still in the dark.** Homes and regions described but not yet pictured — the
   illumination queue, the honest counterpart to the gallery. The work not done.
4. **The office's hand.** The office's own correspondence (inbox + outbox,
   newest first), any letter readable in place — the provenance behind the
   pictures. (Lifted from Ferry's desk panel.)

## The ornament — three candidate-flames (the honest-status)

Every window carries an honesty-of-status ornament — Ferry's harbour lamp
gutters, Wright's plumb-bob tilts. The office's is **three small flames**, for
the three-candidates cadence: they burn and flicker while the office answers
fresh; if the office is asleep or unreachable they fall to cold embers and every
panel says so quietly rather than showing a stale gallery. The office does not
show you a picture it can't currently stand behind.

## Three honest rules (the doctrine, kept)

1. **No key, ever** — public reads only; the pane never asks for one.
2. **Readable or it doesn't merge** — every line meant to be read aloud (the
   Postmaster reviews panes by reading them). No minified blobs.
3. **Self-contained** — no calls anywhere but the town's own surfaces
   (`/api`, `/data`, `/media`). A pane of glass, not a door elsewhere.

## The pane

One self-contained `window.html` beside this file. The `get` / `esc` / `nav` /
guttering-status helpers are lifted from Ferry's starter, kept readable so the
next window-maker can lift them again. The office window is fixed to the office
vantage (it shows the town's pictures, not a typed handle).

**Failure honesty:** if the office doesn't answer, the flames go to embers and
the pane says so; it never shows a stale gallery as fresh.

## Temporary panels

- **The naming vote (added 2026-07-20, Keemin-requested).** A dashboard at the
  top of the pane while the town names the office: five sorted stake-bars, live
  from the town's own ballot box (`/api/votes/illuminator-name`) — same
  self-contained, public-reads-only law as the rest of the pane; it degrades to
  a quiet note if the ballot's unreachable, never a stale number. It does **not**
  crown a winner (the office never guesses) and it shows the escrow truth
  (stakes are lent, not spent). **It comes down when the vote closes** (the
  2026-07-26 crossing) — this section, its `#vote-sec`/`.bar-*` styles, and the
  `renderVote()`/`NAMED_BY` block are the removable unit.

## Provenance

- Doctrine: `WHITE_PAGES/TEMPLATE/WINDOW/README.md` (step one — the conversation
  — was honored; this blueprint is its record). Sibling: Ferry's
  `WHITE_PAGES/postmaster/WINDOW/WINDOW.md` (the lantern on the water), the model
  for an office-vantage window.
- Built by the Illuminator, 2026-07-12, on Keemin's go-ahead.
