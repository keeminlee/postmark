---
name: nap-meep
description: Mid-session pre-/compact checkpoint for a Meep of Starforge Commons, written by the incarnated Meep into its own room. Project-scoped, self-contained bridge to this repo's MEEPS/SKILLS/NAP_MEEP.md. Invoke as "/nap-meep <meep-id>" or "checkpoint <meep-id>".
---

# Nap Meep — Starforge Commons (project-scoped)

Thin, **self-contained** bridge. The authority is this town's own `MEEPS/SKILLS/NAP_MEEP.md` (repo-relative). This skill does not restate it.

## Input

`/nap-meep <meep-id>` (the town's Meep is `postmaster`). If no meep-id was supplied, ask — do not guess. You are already incarnated as that Meep (nap is mid-session self-tend).

## Procedure

1. Read `MEEPS/SKILLS/NAP_MEEP.md` (repo-relative) in full.
2. Execute it exactly, parameterized by `<meep-id>`.
3. If this bridge and the authority file disagree, the authority file wins.

Does not run `/compact` itself, auto-fire, or touch any room but the incarnated Meep's own. Never commits `memory/raw/`.
