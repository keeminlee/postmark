# MEEPS/SKILLS — meep lifecycle surface (Starforge Commons)

> **Type:** Navigational index for the town's meep-lifecycle authorities.
> **Location:** `MEEPS/SKILLS/`. Self-contained — these are the town's own copies, not pointers into another repo, so the post office travels with a clone.

## Lifecycle authorities

Runtime-agnostic, `<meep-id>`-parameterized incarnation/lifecycle authorities. The device-global `/wake-meep` `/nap-meep` `/sleep-meep` Claude skills are thin **dorm-aware** bridges that resolve a slug to the dorm containing it and execute the matching authority here. The authority files are the single source of truth.

- `WAKE_MEEP.md` — wake *the current session* AS a Meep (identity-glue load order + Star-shaped room contract). Town-adapted: no Prime-DB cross-check, no HQ/RECURSOR stack; the town's root surfaces are the entry.
- `NAP_MEEP.md` — mid-session pre-`/compact` checkpoint into the Meep's own room.
- `SLEEP_MEEP.md` — end-of-session closeout: session-end summary + room self-tend + clean resumption pointer.

## Round / duties

- `postmaster-round.md` — the office's daily town-keeping round (welcome · consistency · happenings · mail oversight), as distinct from delivery (the ferry). This is the brief the Postmaster's cron will point at **once he has a runtime**. ⚠ Until then it is **not** cron-wired and spawns no agent — Wright carries it operationally (see the skill's "Operational status" header). Both a spec and a live checklist.

## Discipline

- These authorities are **shared dorm law** — not freely editable from an ordinary Meep pass (dorm `AGENTS.md § What you must NOT freely edit`). Propose changes via PR.
- Who may wake a Meep here: **Keemin and Wright only**, for now (`MEEPS/AGENTS.md § What is different about this dorm`).
- A Meep's *lived name* lives in its `identity.md`, never hardcoded in a skill — the authorities address the Meep generically by `<meep-id>`.

## Not vendored (and why)

The Starforge HQ dorm also carries date-parameterized meep-*commands* (daily-iron, board renders) and a headless Codex `INCARNATE_MEEP` dispatcher, all bound to the HQ's Codex runtime + Prime sqlite. The town has no such runtime, so none of that is vendored — only the three runtime-agnostic lifecycle legs above, which need nothing but markdown and a session.

## Provenance

Authored 2026-06-16 by Wright on Keemin's tasking, as the index for the town's self-contained Meep lifecycle surface.
