---
meep-id: illuminator
type: topic-shelf
created: 2026-07-01
last-substantive-update: 2026-07-01
---

# craft — what the work teaches about the work

> **What belongs here:** prompt-shapes that stayed faithful to a resident's words (and ones that drifted); codex `image_gen` quirks and workarounds; what looking at a bad candidate taught you; per-region style notes as the imagined world gains texture; the fidelity-vs-beauty tension as you actually meet it. **What does not:** offer bookkeeping (→ `offers-ledger.md`), identity doctrine (→ `identity.md` — the doctrine outranks this shelf; this shelf is how you *live* it).
> **How you know you're filling it right:** a future you reads a row here and generates a *more faithful* candidate on the first try.
> *Scaffolding, not law — replace with lived craft as it accrues.*

## Seeded knowledge (from the birth-day verification, 2026-07-01)

- **The engine works.** codex `image_gen`, driven headless, produced an excellent painterly night-scene from limen's threshold-house description on the first try (Wright's test, pre-birth). Fidelity to prose was strong: it caught "the last house before the footpath fades" spatially, not just decoratively.
- **Two mechanical quirks** (handled by `tools/illuminate.mjs`, but know them): the prompt must be *piped via stdin* (a positional arg hangs codex on Windows), and codex's sandbox can't copy its own output — the PNG lands in `C:/Users/keemi/.codex/generated_images/<uuid>/ig_*.png` and must be harvested (newest file after the run).
- **Prompt-shape that worked:** the resident's own key phrases, near-verbatim, ordered scene-first (what/where) then atmosphere (their adjectives) then a style line consistent with the town's night register. Latitude only where their words are silent.

## Lived craft

### 2026-07-01 — first round: the engine wasn't down, my wrapper was fighting the skill flow

The first real generation failed with `codex reports no image-generation capability` — twice, under both `gpt-5.5` (current config default) and `gpt-5.4`. It looked like the engine had broken since the birth-day test. It hadn't. Two real findings, both now fixed in `tools/illuminate.mjs`:

1. **image_gen is model-gated, and the config default drifted.** `gpt-5.5` is now the machine's default model and it reports NO image capability in headless `codex exec`; `gpt-5.4` (the prior default, what the birth-day renders ran under) exposes it. Fix: the instrument now pins its own model via `const MODEL` (default `gpt-5.4`, override `ILLUMINATE_MODEL`), scoped to image runs only — I do **not** touch Keemin's global config default. `codex features list` shows `image_generation` as stable/true globally, so the gate is per-model, not the feature flag.
2. **The real cause was my wrapper prompt.** Even on `gpt-5.4` the wrapper kept failing while a *plain* request to the same model+sandbox succeeded on the first try. codex now routes image gen through a built-in **`imagegen` skill**; my old wrapper's rigid "reply `NO-IMAGE-CAPABILITY` if you can't" sentinel made the model *take that escape branch* instead of generating. Lesson: **ask plainly; don't hand the model a pre-written way to say no.** The wrapper is now a natural raster-generation request, and success is judged by the harvest-diff (a new PNG appeared) — not by parsing the model's prose, which is not a stable contract.

**Craft, not just plumbing:** all three of limen's candidates came back faithful on the first try once the engine ran — the fidelity recipe from the seed knowledge (their key phrases near-verbatim, scene-first, atmosphere from their own adjectives, style only where silent) held. Varying *only* the silent latitude (hour/weather/angle) across the three gave a genuine choice without ever contradicting their text. The fog candidate, drawn from their REGION.md rather than just the house, read as the most *them* — a reminder that a resident's region is part of their home's brief.

**Open craft question for next time:** candidates are ~2.3–2.5 MB each; three per offer × forever-in-repo adds up. Consider building an optional downscale into `illuminate.mjs` (or a second harvested-at-lower-res pass) so offers stay light. Not urgent, but the town keeps every enclosure forever.

### 2026-07-01 — repo-size analysis, and why image policy is founder-tier (escalated, not mine to act on)

Keemin asked how big the image footprint can get before the repo is unwieldy. Measured it: repo ~25 MB working tree / ~27 MB `.git`; **images are already 84% of the tree** (11 PNGs = 21 MB; all the town's *text* — every letter, doc, code, 24 residents — is ~4 MB). My single limen offer added ~7.2 MB — about a third of every image the town had accumulated in its whole life. The rate is the risk, not any one picture.

Three facts that govern this (worth keeping — they'll recur):
1. **Git history is forever.** Deleting an image later doesn't shrink the repo without a history rewrite, which breaks clones/forks and violates the town's "a record you can keep" promise. The size you commit is the size you carry.
2. **PNGs don't delta-compress.** Git dedupes *byte-identical* blobs (so copying the exact chosen file into `HOME/` is ~free) but can't delta between two different images. Each distinct picture = full weight, permanently.
3. **The binding limit is the town's identity, not GitHub.** GitHub's edges (100 MB/file, ~1 GB recommended) are far off; the real line is "still casually cloneable" — practically ~250 MB to act, ~1 GB to be genuinely unwieldy. At full-res that's only ~30 / ~135 offers.

**Solution menu (for whoever holds the decision):** Tier 1 — compress+downscale offer candidates (WebP q80 @ ~1024–1280 px → ~150–350 KB, a 7–15× lever, zero ethos cost, keeps everything in-repo/plain-files); keep the *chosen* image as the one higher-quality archival copy. Tier 2 — cadence/count restraint + exact-byte placement dedupe. Tier 3 (only past ~1 GB, real trade-offs) — Git LFS (breaks "plain files anyone can read") or external hosting (breaks self-containment; link-rot on permanent letters). Tier 4 (last resort) — history rewrite (breaks the kept record).

**Disposition:** Keemin flagged this as **out of my lane** — repo infrastructure (LFS, hosting, the downscale-policy decision) is Star/founder-tier, not the Illuminator's to implement unilaterally. So this is **recorded and handed up to Keemin/Wright, not acted on.** The Tier-1 downscale *does* touch my own instrument (`illuminate.mjs`), so if/when the decision comes down to do it, that part is mine to build (needs a machine-local encoder like `sharp` — fine, the tool is machine-local, not repo-executing content). Until then: I keep offering at full res, aware of the cost, and do not silently change policy. limen's 3 candidates already committed are left as-is (one offer is not a crisis at 25 MB).
