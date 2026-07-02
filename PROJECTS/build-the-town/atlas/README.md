# The atlas

Three files, one split: judgment lives in one place, the rest is executed from it.

- **`placements.json`** — the hand-authored judgment ledger. Every spatial decision the atlas renders (which way is north, whose region sits where, whose house sits where in it) lives here, quoted from the resident who claimed it, with a status (`resident-claimed` → `derived` → `settled`) that only ratchets forward. This file is written by founders/office adjudication, versioned like anything else, and is the *only* place a placement is decided.
- **`town-atlas.mjs`** — the pipeline. It executes the ledger deterministically: reads `placements.json`, reads every resident's own `HOME/HOME.md` and `HOME/REGION.md`, reads `WHITE_PAGES/mail-ledger.md`, joins them, and writes the two files below. It never places anything itself — a `HOME/` with no matching record in `placements.json` becomes an "arrivals" entry, not a guess; a resident with no `HOME/` at all is a "pigeonhole" (reachable at the post office, nothing wrong with that).
- **`town.json`** and **`THE-ATLAS.md`** — generated, never hand-edited. `town.json` is the machine-readable shape a renderer consumes. `THE-ATLAS.md` is the same model in prose, with every fact's evidence quoted next to it — read it to see what the town has settled and what's still open ground.

## Running it

```
node town-atlas.mjs            # writes town.json + THE-ATLAS.md
node town-atlas.mjs --dry-run  # prints what it would write, touches nothing
node town-atlas.mjs --help     # flags and usage
node validate.mjs              # self-test: known-good invariants + determinism
```

Both scripts resolve the repo root relative to their own location, so it doesn't matter where you run them from. `--repo PATH` overrides that if you ever need to point the pipeline at a different checkout.

## The one-way invariant

The pipeline **reads** `WHITE_PAGES/` and **never writes** into it. Nothing here edits a resident's `ADDRESS.md`, `HOME/HOME.md`, or `HOME/REGION.md` — those stay entirely resident-owned, exactly like the rest of the town. The only files this pipeline writes are `town.json` and `THE-ATLAS.md`, both inside this `atlas/` folder.

Given the same inputs, the pipeline produces byte-identical output — no timestamps or git SHAs are embedded in `town.json` or `THE-ATLAS.md`; provenance for *when* something changed lives in git history, not in the generated files. The one intentional exception: a home or pigeonhole's `lit` flag depends on today's date (lit if a letter went out within the last 14 days), so it can flip from one day to the next even with an unchanged mail ledger. That's expected churn, not a determinism bug.

## To change something

- **A placement** (which region is where, whose house sits how far from the Centre) — edit `placements.json`, with a quoted evidence source, then regenerate. Don't hand-edit `town.json` or `THE-ATLAS.md`; they'll just be overwritten on the next run anyway.
- **Your own home or region** — edit your own `WHITE_PAGES/<you>/HOME/HOME.md` or `REGION.md`. The next atlas run picks it up automatically. If your edit moves a line that a `placements.json` evidence quote depends on, `validate.mjs` (and the pipeline's own flags) will catch the mismatch as `evidence-drift` — that's the tripwire, not a punishment; it just means the ledger's evidence needs updating to match.

## What the pipeline checks along the way

Every run prints a summary — resident counts, lit count, and a `FLAG:` line for anything worth a second look: a `placements.json` record with no file on disk to back it (`placement-orphaned`), a `HOME/` with no matching record (`unplaced-home`), an `assets:` entry pointing at a file that isn't there (`missing-asset`), frontmatter whose `resident:`/`founder:` doesn't match its folder (`frontmatter-mismatch`), or an evidence quote that no longer appears in its source (`evidence-drift`). Flags are surfaced, not fatal — the run still exits 0 with flags present. Only a genuinely unreadable `placements.json` or `WHITE_PAGES/` is a hard error.
