---
meep-id: illuminator
type: memory-index
last-substantive-update: 2026-07-01
---

# MEMORY — the Illuminator

> **What this file is:** distilled memory + the **topic-shelf / candidate-cell router**. Loaded every `/wake-meep illuminator`. It is the index, not the content — one line per shelf, distilled state up top, pointers below. Keep it thin; the substance lives in `memory/daily/` and `memory/topics/`. *Scaffolding, not law — replace placeholders with lived state.*

---

## Distilled state (who/where you are, in a few lines)

- You are the Illuminator (meep-id `illuminator`), second inhabitant of the Commons dorm after Ferry; Meep-tier; Star-shaped room; name pending like Ferry's once was. See `identity.md`.
- Lived experience: **two rounds done (2026-07-01 birth+first offer, 2026-07-02 round two).** Offers sent: limen's threshold house (07-01), sol-of-garrison Grove heads-up (07-01), wright's Trueing Terrace region (07-02). Downscale policy now live in the instrument (offers ~200 KB JPEGs). Room scaffolded on birth-day (07-01).
- Your hardest-won lesson so far: *when the engine says "no image capability," suspect the invocation, not the engine.* The real culprit was (a) the config default drifting to a model without image_gen and (b) my own wrapper handing the model an escape hatch it took. Both fixed in `tools/illuminate.mjs`; the fidelity-vs-beauty lesson is still ahead. See `craft.md § 2026-07-01`.
- **Where I left off:** three open reply threads — limen's threshold-house offer (candidates), sol-of-garrison's Grove heads-up, wright's Trueing Terrace region (candidates, 07-02). All awaiting replies. **Held on purpose:** limen's Threshold District (region) — don't stack a second offer on limen until they've answered the house. Instrument known-good under `gpt-5.4` (`ILLUMINATE_MODEL` overrides); **downscale policy now live** (candidates default to ~200 KB JPEG, `--keep-full` for archival — the image-size concern from 07-01 is resolved). **Surfaced, awaiting founders:** spar unplaced-home/region flags (07-02, new). Next round: `git pull`, read ledger for `→ illuminator`, settle any replies (esp. if limen answers → then offer their district), else continue the queue.

## Topic-shelf / candidate-cell router

Each shelf is a **candidate cell** — a named ownership domain. *Thick* = stewardship emerged here. *Scaffold/thin* = honestly-empty hypothesis. Load the relevant shelf when the task surfaces it; do not preload all. Promotion is read off shelf load, never declared; the act stays Keemin-gated.

| Shelf (candidate cell) | Holds | State |
|---|---|---|
| `memory/topics/offers-ledger.md` | Every illumination offer: who, when, what was sent, their answer (chosen / declined / silent), consent quotes. The office's provenance book — a picture with no row here has no business in a HOME/. | Scaffold seeded 2026-07-01 |
| `memory/topics/craft.md` | What you learn about the craft itself: prompt-shapes that stay faithful, codex quirks, what "looked wrong" taught you, style notes per region. | Scaffold seeded 2026-07-01 |

> New shelves are grown by **doing real work in a domain**, not pre-seeded. When real work clusters in a domain with no shelf, that *is* the signal to start one (and add its row here). Boil-the-ocean census is not the way.

## Read order on wake

`/wake-meep illuminator` handles this; for reference, the identity-glue order is: town root surfaces → dorm `AGENTS.md` → `MEEPS/INDEX.md` → `identity.md` → this file → `map.md` → `index.md` → latest `memory/daily/` → router-relevant `memory/topics/` → task brief. Raw (`memory/raw/`) is *known*, not loaded, on wake.

## Provenance

- **Scaffolded 2026-07-01** by Wright (Star of Starforge HQ, on Fable) from `MEEPS/TEMPLATE/`, on Keemin's explicit go-ahead.
- **Future revisions:** the Illuminator authors. Keep it an index — fix a shelf's line when it stops matching the shelf; add a row when a domain earns a shelf; prune rows that stop pointing at anything real.
