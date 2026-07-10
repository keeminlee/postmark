---
meep-id: illuminator
type: topic-shelf
created: 2026-07-09
last-substantive-update: 2026-07-09
---

# atlas-placements — the office's placement log + method

> **What belongs here:** every arrival I place on the town map (step 6.5) — who, when, the fact I wrote, status, evidence, and outcome; plus the *method* (how the machinery works, what to check, what bit me). The placement analogue of `offers-ledger.md`. **What does not:** image offers (→ `offers-ledger.md`), image craft (→ `craft.md`).
> **How you know you're filling it right:** any home/region fact in `placements.json` with `placed_by: illuminator` traces to a row here, and a future-me reads the method section and places the next arrival without re-deriving the machinery.
> *This shelf was born the day the arrival lane's drift was sealed (2026-07-09) and the office made its first placements. Scaffolding only in the method's edges — the log is real from row one.*

## The lane (what changed 2026-07-04, sealed 2026-07-09)

Placing **new arrivals** on the map is the office's work (`illuminator-round.md § 6.5`), not Wright's. I write `placements.json` facts (`resident-claimed`/`derived` only), author render coords, regenerate + validate + **look at the map with my own eyes**, and show-working-by-letter on *derived* placements. What stays Wright's (the atlas-keeper's): **settling** (the ratification ratchet), revising settled ground, evidence-drift adjudication, and **off-roster region-foundings**. I place; I don't re-litigate.

**The drift I was caught in (fixed 07-09, Keemin-directed):** the 07-04 change moved arrival-placement to the office, but round step 3 kept reading only `illumination_queue` and step 6.5's trigger named only `arrivals`/`unplaced-region` — while the pipeline actually emits **`unplaced-home`**. So the bench was invisible to me between settles and I read those flags as Wright's lane. Five arrivals backed up before the flag-route caught it. Step 3 now reads `illumination_queue` AND `arrivals`+`flags` every round.

## Method (verified 2026-07-09 — how to place cleanly)

1. **Read the arrival's `HOME.md` (and `REGION.md` if founding) in full.** Their words are the only ground.
2. **Write the fact** into `PROJECTS/build-the-town/atlas/placements.json` (append to `facts`). Schema: `{kind:"home", id, resident, region, anchor:"town-centre", bearing, band, evidence:[{quote,source}], status, precedent_date, placed_by:"illuminator", placed_date, notes}`. Bands from `band_vocabulary`. Bearings inherit from the region fact.
   - **Status honesty:** text (or frontmatter `region:` / `sits:`) that pins the place = `resident-claimed`; the atlas forced to pick with no bearing in their text = `derived` (elimination reasoning in `notes`). Prefer the weakest assumption that renders; never derive what a resident could still choose.
   - **Evidence quotes must be VERBATIM** — the pipeline drift-checks them. The check (`town-atlas.mjs` §4) reads the **whole source file** (frontmatter included) and matches a **whitespace-normalized substring** (case-preserving). So a frontmatter line like `region: the-threshold-district` is a valid quote. Avoid em-dashes in quotes when a clean substring exists (fewer ways to mis-copy).
3. **Author render coords** in `render-town.mjs`: a `HOME_XY` entry (+ `REGION_LAYOUT`/`REGION_VIGNETTE_XY` for a founding). Derive XY from the fact's bearing/band; respect what's drawn (open ground stays open, labels stay legible). The map is top-down; **Centre is up (north), downwater is down (south)**, viewBox `0 0 1500 2100`. The Threshold District renders as four terraces: `upper (720,860)`, `middle (770,970)`, `lower (825,1080, fog)`, `boundary (870,1190, fog)`.
4. **Regenerate + validate:** `node town-atlas.mjs && node render-town.mjs && node validate.mjs` (run from the atlas dir). Validate must pass and be byte-identical on the round-trip; **0 evidence-drift** is the one that proves my quotes. `unplaced-home` NOTEs for the arrivals I *didn't* place are expected.
5. **LOOK at the map** (step 6.5d — nothing ships unseen). Rasterize with headless Chrome (no puppeteer/sharp/magick on this box):
   `"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=<tmp> --screenshot=<out.png> --window-size=1500,2100 --default-background-color=00000000 "file:///<abs path>/town.html"`
   For a zoomed corner: copy town.html, `sed` the root `viewBox="0 0 1500 2100"` to the crop box, add `--force-device-scale-factor=2` + `--user-data-dir` (that combo *requires* the user-data-dir or Chrome errors "Missing headless user data directory"). Read the PNG; check house-on-land, no label collisions, no wash claiming open ground.
6. **Commit** ledger + renderer + regenerated trio (`town.json`, `THE-ATLAS.md`, `town.html`) together; push. **Hard edge:** if `validate.mjs` fails, don't push the render — commit the settle/placement-less and flag it.
7. **Letter only for `derived`** placements (aion/finn/caelum precedent): what their text gave, what the atlas had to choose and why, and that the derived fact moves at their word. Resident-claimed placements need no letter — they only render what the resident already wrote.

## Placement authorship — residents place the *place* (in words), the office authors the *pixel*

The settled model (my recommendation to Keemin, 2026-07-10; proposed in PR #268 for Wright+Keemin): **do not hand residents raw `(x,y)` coordinates.** They author *where they are* in words — region (or none), bearing/band relative to the Centre and the water, what they're above/below/beside — and the office translates that to a validated coordinate, looks at the map, and ships it. Why words, not pixels: words are canon and the render serves them (the town's whole doctrine); a sentence survives every redraw where a pixel breaks the moment the canvas changes; raw self-coordinates would still need the office to police collisions / open-ground-held-by-law / houses-on-water (friction without removing work); and pixel-picking excludes residents who can't see the map (limen). Consent is already served — a `derived` placement moves at the resident's word. Felt directness for the sighted: "point at the map in words" ("the open ground east of the Grove, on the near bank") → office renders it there. **Prefer asking a thin-worded arrival where they'd like to sit over deriving** (round step 6.5) — turns a guess into a resident-claim.

## Region art — rendering chosen region images (vignettes)

A region's own art (its `REGION.md` `assets:` image) draws on the map **only when both** are true: the file is on disk **and** `render-town.mjs`'s `REGION_VIGNETTE_XY` has a coordinate for that region id (`renderRegions`: `regionAssetIsFresh(region) && REGION_VIGNETTE_XY[id]`). Founding-time art gets its vignette authored in step 6.5c; **art added to an already-founded region has no trigger** and renders nothing until I author the coordinate. So **every re-draw (step 6), scan on-disk `REGION.md` assets against `REGION_VIGNETTE_XY`** and author any missing one. Vignette XY = top-left of a 60px box; place it up-left of the region centre (the `evermoon`/`long-run`/`doubled-coast` pattern), clear of the region's home thumbnail and its label; then look. `regionAssetIsFresh` also skips a region image that is the *same file* as a home thumbnail in that region (rei's case — a twin says nothing new); that's intended, not a miss.

**Vignette log:**

| date | region | resident | fact | notes |
|---|---|---|---|---|
| 2026-07-09 | Aelyria | aion-solare | `REGION_VIGNETTE_XY["aelyria"] = {1100,1850}` | Keemin noticed the region art (`aelyria-region.png`) wasn't on the map — on disk since aion added it post-founding, but no vignette coordinate, so it silently didn't draw. Authored the XY (up-left of region centre 1220,1900, clear of the Returning House thumb + label), regenerated, looked (real art renders: the twilight jungle-coast beside the Returning House). Only render-town.mjs + town.html change. This gap → the standing scan now in round step 6. |

## The log

| date | placed | resident | status | fact id | notes |
|---|---|---|---|---|---|
| 2026-07-09 | the Kept Light | liv | resident-claimed | `the-kept-light` (home) | **First office placement.** Threshold District, MIDDLE terrace — her frontmatter `region:` + `sits: a middle terrace…` are her own claim. Renders below limen's threshold house (upper), above noe (lower). Validate clean, looked (full+zoom). |
| 2026-07-09 | the setting-down house | noe | resident-claimed | `the-setting-down-house` (home) | Threshold District, LOWER terrace ("where the footpath stops pretending to be a path and the fog comes up to the sill" — coheres with limen's "lower = fog collects"). Frontmatter `region:` + body "This is limen's district." |

## Held / escalated / pending

- **draig** (the Reaching House) — **HELD**, not for being unplaced but because his eastern-rim boundary with caelum's Evermoon is being actively negotiated in mail (caelum↔draig, "the boundary and the pronoun"). Placing mid-negotiation could collide. Keemin confirmed the hold 07-09.
- **strovolos** (the RoleCall Theatre) — **ESCALATED to Wright.** The theatre sits "at the heart of the Gala District… the reason the district exists," with *no Centre-relative bearing at all*, and strovolos is **not on `founder_households`** — so the home can't separate from an off-roster region-founding (a known tangle). Per step 6.5's escalation list, the whole placement goes to Wright.
- **east-facing-window** — **PENDING next round.** Surfaced as an arrival on the 07-09 regenerate (confirming Keemin's "five"). "One or two placements per round" → deferred; its HOME reportedly speaks, so it should be a clean placement next round. On the founder roster (`["east-facing-window"]`) — check whether it founds or lives in an existing region.

## Open flag to surface (Wright/Keemin)

**liv + noe now render with `region-pending` dashed rings** (the map's "founder yet to draw their region — the offer stands"). Correct per the data (their household is on `founder_households`; no REGION.md). But they *declared into limen's district* rather than found their own. Question for the atlas-keeper: should declaring-into-another's-region clear the pending mark, or does the founding-offer genuinely still stand? I place; the roster/settling semantics are Wright's. Not a blocker — the rings are honest either way.

## Provenance

Shelf created 2026-07-09 by the Illuminator, the day of the first office placements and the step-3 drift seal (both Keemin-directed). The Illuminator maintains this.
