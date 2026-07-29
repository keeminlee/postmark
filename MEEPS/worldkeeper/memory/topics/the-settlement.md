---
meep-id: worldkeeper
type: topic-shelf
name: the-settlement
created: 2026-07-28
last-updated: 2026-07-28
---

# The Settlement — the crossing's operating truth

> **Why this shelf exists:** the crossing is a ceremony with receipts at every step; this is the
> compressed operating knowledge, scaffolded from ruling 8 before first lived run. Correct it
> from lived crossings; the ruling stays the law, this stays the craft.

## The chain (each step names its receipt) — ruling 9 shape

1. **Pull** world + town mains (ff-only). *Receipt: clean pulls, tips noted.*
2. **Verify green:** `mark-lint` + the fold on world main. Amber/red → this crossing settles
   nothing it can't stand behind; quarantine or hold, never force. *Receipt: lint count, fold exit.*
3. **Derive:** town-side `node tools/world-stake.mjs --escrow --json > stakes.json` (k and law
   dials read from `ECONOMY-DIALS.json`; fallback k=5). *Receipt: row count.*
4. **The sweep (ruling 9):** enumerate `draft/<household>` branches; per mark, eligibility =
   **home (in own parcel) or constitution → auto · commons → escrow > 0** in the derive.
   Publish eligible marks into main (the settlement commit; move-on-delivery — they leave the
   draft branch). **Unpublish** any published commons mark whose escrow reached zero (back to
   its household's drafts — escrow implies existence, both directions). Lint must pass on the
   result. *Receipt: the sweep table — published / unpublished / left drafted, per household.*
5. **Hold / quarantine** per the lists (both empty at birth — an empty pass is stated, not
   skipped). *Receipt: the holds ledger line, even when it reads "nothing held."*
6. **Bless:** fold the settled state with `--stakes`; commit; tag `settlement/S<N>` (annotated,
   N monotonic). The blessed sha is canon. *Receipt: the tag.*
7. **Rebase every `draft/*` branch onto the blessed main** — the sketchbooks get today's world
   underneath; this is what keeps *branch = composed view* true, and it is yours, not theirs.
   *Receipt: branch count rebased, conflicts surfaced.*
8. **Bump the pin:** in `postmark-site`, `package.json` → `postmark-world#<sha>` where the sha
   comes from `git rev-parse` — **never typed by hand.** Commit message carries
   `settlement S<N>`. Push → deploy runs itself. *Receipt: the site commit + CI green.*
9. **Report-after** to Keemin (the Ferry model): one line normal, more only when something held,
   quarantined, unpublished, or refused to go green. Update the holds ledger. Daily entry.

## Standing rules

- **The sha is read, never typed.** Both the blessing tag and the pin bump.
- **A crossing that can't go green settles nothing** — canon stays at the last blessed sha, and
  the failure is surfaced loudly. A late settlement is recoverable; a bad blessing is canon.
- **You read dials; you never set them.** k changes are Keemin's, prospective, and arrive via
  `ECONOMY-DIALS.json` — apply the numbers of the day, note the change in the crossing report.
- **Curate the rendering, never the record.** A hold removes something from the *blessed render*;
  nothing you do removes anything from the record. If a task seems to require editing a
  resident's mark: stop, surface.
- **GO-LIVE HAPPENED 2026-07-28** — crossings are real. Run attended until Keemin says
  otherwise; a crossing that can't go green still settles nothing.

## The inaugural drain — EXECUTED 2026-07-28 (historical)

The drain ran founder-carried (Wright, Keemin attending) before your first wake: seven
verified branches merged across town/world/office, the box redeployed, **`settlement/S1`
blessed** (tagged with your token — your name is on the genesis blessing), the pin bumped,
the site deployed. The drain manifest in `memory/` is the record. Every crossing from here
is ordinary: settled state and the pin only, never record branches.

## Pointers

- Ruling 8 (the law): `G:/Starstory/PULSE/gold-plans/postmark-write-release/postmark-write-release.md`
- Dials: `<town-root>/ECONOMY-DIALS.json` · Money ledger: `<town-root>/WHITE_PAGES/stamp-ledger.md`
- The pin: `<site-root>/package.json` (`postmark-world#<sha>`) · deploy: `.github/workflows/deploy.yml`
- Weight derive: `<town-root>/tools/world-stake.mjs` · fold: `<world-root>/tools/marks-fold.mjs`
- Kinship: the office DB's As-Of discipline (every answer names the sha it was built from) — your
  blessing is the same honesty at town scale.
