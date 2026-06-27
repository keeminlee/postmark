# TEMPLATE — birthing a new town-Meep

> **Path:** `MEEPS/TEMPLATE/`
> **Purpose:** Skeleton room for a new Meep of Starforge Commons. Copy this directory when Keemin (or Wright with Keemin's explicit go-ahead) births one.
> **Authored:** 2026-06-16 by Wright. The postmaster's room (`MEEPS/postmaster/`) is the worked example — read it alongside this.

---

## Read this before using the skeleton

- **Canonical room contract:** `MEEPS/SKILLS/WAKE_MEEP.md § Step 3` — the Star-shaped room (`identity.md` + `MEMORY.md` router + `map.md` + `index.md` + `memory/{daily,raw,topics}/`) is the **default** for any continuity-bearing Meep. Fill that.
- **Lean escape hatch:** a genuinely tiny single-lane / one-shot helper may instead keep a flat `memory.md` / `map.md` / `index.md`. Default to Star-shaped; use lean only when the lane is truly disposable, and ask Keemin or Wright when unsure.
- **Scaffolds are self-instructive, never blank.** Every scaffolded file/shelf states, in its own body: what belongs here, what does not, how you know it's filling right, and an explicit "scaffolding-not-law — replace as lived substrate accrues" marker. The skeleton files here follow that; keep it when you adapt them.
- **This dorm is public.** Nothing private goes in a room here. `memory/raw/` is git-ignored and never committed — the template does not even ship a `raw/` dir; it is created (locally, ignored) only if a runtime ever captures into it.

## When a new Meep is born

A Meep is born by Keemin, never by Meep-declaration. Stewardship pressure surfaces in an existing Meep's `memory/`; Keemin (with Wright) decides if and when to instantiate.

When the decision lands:

1. **Pick a `meep-id`** (kebab-case dir name) — a kind-name for the lane (e.g. `archivist`, `greeter`) or a personal gift-name if Keemin gives one. A named Meep is still a Meep; the name is the gift, not a tier-promotion.
2. **Copy the template** and remove this README:
   ```sh
   cp -r MEEPS/TEMPLATE MEEPS/<meep-id>
   rm MEEPS/<meep-id>/README.md
   ```
3. **Fill the room files** — replace every placeholder with substantive content for *this* Meep's lane. The `Lane` line is the single-sentence answer to "what does this Meep exist for"; if you can't write it cleanly, the lane isn't bounded enough yet.
4. **Keep `memory/daily/.gitkeep` and `memory/topics/.gitkeep`** so the dirs exist; the Meep writes its first daily when first woken.
5. **First wake:** `/wake-meep <meep-id>` loads the dorm + the (still-scaffold) room + the brief. The room compounds from there.
6. **Record the birth** in the Meep's first daily and in Keemin's day-doc — birth events are substrate.

## What NOT to copy

- This `README.md` (template-only).
- Don't invent a `raw/` dir; it's runtime-only and git-ignored.

## When the template needs to evolve

If you fight the structure, surface it in your `memory/` for Keemin or Wright to review — don't unilaterally rewrite `TEMPLATE/` (it's shared dorm law). Propose changes via PR.
