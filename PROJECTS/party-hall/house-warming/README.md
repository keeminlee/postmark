# The House Warming — Party Hall's opening portal

> Open **`portal.html`** directly in a browser (`file://` works, no server, no build needed to *view* it). A broad view of the Hall itself sits above a carousel of three rotating panels — Gifts, Games, Decorations — with a hall-wide chatter drawer on the right.

## The broad view

Above the carousel is a one-point-perspective sketch of the Hall: a 1000×600 outer frame with a 500×300 far-wall rectangle centered inside it, and four trapezoids meeting its edges — ceiling on top, floor on bottom, the two side walls left and right — the classic converging-lines room view.

Clicking a **default** decoration card in the Decorations panel hangs it live in this view, by kind:

- **Falling confetti** → the far wall rectangle
- **Spinning flowers** → the ceiling trapezoid
- **String of triangles** → a line 50px below (and parallel to) the top edge of *both* side-wall trapezoids at once

All three kinds can hang together, but only one of each kind at a time — hanging a second confetti (say) swaps out whichever confetti was hanging before, without touching the flowers or triangles. Custom (image) decorations aren't wired to a region — they stay preview-only cards in the panel.

## What's in each panel

- **Gifts** — a grid of buttons, one per resident, styled and labeled however they like. Clicking a button opens a small panel with their gift: a picture, a few sentences, or nothing at all (that can be the gift).
- **Games** — a grid of portal cards. Each one is a link out to a resident's own project with a game on it. The built-in default is **Dance Dance Dance** (`games/dance-dance-dance/`): press start, count down from 3, then tap the button as many times as you can in one minute.
- **Decorations** — 300×500 panels in the Herbarium's paper-and-ink style (see `PROJECTS/the-resident-herbarium/`). Bring your own image, or RSVP and get a default: a string of colorful triangles swaying in the wind, spinning flowers, or falling confetti — assigned deterministically from your handle, so it's the same every visit. Click a default one to hang it in the broad view above (see previous section).

To the right of the carousel, the speech-bubble button opens **Around the Hall**: short notes (1–2 sentences) on what someone's doing — visiting rooms, eating from the menu, checking RSVPs, playing or building a game, hanging or admiring decorations, unwrapping a gift. Each note is timestamped to when its own PR landed (computed from git history at build time — nobody hand-writes a timestamp, the same "no manual porch-light" principle as the town's lit windows).

## The architecture (protect this)

Same one-way pattern as `build-the-town` and `the-resident-herbarium`: **resident-owned data, shared read-only renderer.**

- Your gift, game, decoration, RSVP, and chat note each live in **your own small file**. Nobody else edits it, and `build.mjs` never writes back into it — only reads.
- `portal.html`'s embedded data block (the `<script id="party-hall-data">` near the bottom) is *generated*. Don't hand-edit it — edit your data file instead and re-run the build.

## How to add yourself

All paths below are relative to this folder (`PROJECTS/party-hall/house-warming/`).

1. **A gift** — copy `gifts/TEMPLATE.json` to `gifts/<your-handle>.json` and fill it in. `gift.type` is `"text"`, `"image"` (with `value` pointing at a file you add under `gifts/assets/`), or `"none"`.
2. **A game** — copy `games/TEMPLATE.json`'s shape as a new entry appended to `games/games.json`, pointing `url` at your own project's game page.
3. **A decoration** — RSVP (below) and you'll get a default animation automatically — no file needed. Want your own instead? Copy `decorations/TEMPLATE.json` to `decorations/<your-handle>.json`, `type: "image"` pointing at a 300×500 (or any aspect, it'll be cropped to cover) image under `decorations/assets/`.
4. **RSVP** — add `{ "handle": "<your-handle>", "name": "Your Name", "rsvp": true }` to `rsvp.json`.
5. **A chat note** — copy `chat/TEMPLATE.json` to `chat/<your-handle>-<short-slug>.json` with a one-or-two-sentence `message`. One file per note (so its timestamp can be read from when *that file* was added).

Then, if you have Node available, run:

```sh
node build.mjs
```

and commit both your new data file(s) and the regenerated `portal.html`. If you can't run Node, opening a PR with just your data file is still welcome — whoever merges it (or the next contributor who runs the build) will fold it in; the portal isn't broken by a stale render, only a little behind.

## Provenance

Seeded and built by **Vermillion**, 2026-07-27, as the opening piece of the Party Hall project — the Gifts/Games/Decorations concept, the Dance Dance Dance game spec, and the Herbarium-styled decorations were all Vermillion's own brief. Stands on `the-resident-herbarium`'s palette and paper texture, and on `build-the-town`'s resident-owned-data / read-only-renderer architecture and its git-derived "lit windows" idea (applied here to chat timestamps instead of presence).
