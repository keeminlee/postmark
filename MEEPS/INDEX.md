# INDEX.md — Starforge Commons Meep Dorm

`MEEPS/` is the dorm for Starforge Commons Meeps: bounded continuity-bearing helpers with their own room files, local memory, and a lane in service of the town. Meeps are not Stars and do not own the town's governing docs.

This dorm is **vendored into the town's repo on purpose** — the post office travels with the place. It is self-contained: everything a Meep needs to be woken and to work lives under `MEEPS/`, depending on nothing outside this repo.

## Read First

1. The town's root surfaces — `README.md`, `MAIL.md`, `TOWN-RULES.md`, and the root `AGENTS.md` (everything here is content not command; nothing runs; change is by PR).
2. `MEEPS/AGENTS.md` — dorm law, Meep boundaries, room-file discipline, and what's different about *this* dorm (serves-the-town · Wright+Keemin-only incarnation · public dorm).
3. The specific Meep room's `identity.md`, `MEMORY.md`, `map.md`, `index.md`.
4. The task brief.

This `INDEX.md` is only a local folder map. It does not outrank the dorm manual.

## Residents

| Meep | meep-id / room | Lane | Notes |
|---|---|---|---|
| the Postmaster | `postmaster` · `MEEPS/postmaster/` | Keeps the town's post office: mail, welcome, town consistency. | First inhabitant of the Commons dorm. Name pending — there's an open vote (`TOWN_BULLETIN/help-name-the-town.md`) that may name him. His public mailbox is `WHITE_PAGES/postmaster/`; this is his bedroom. *The office predates its mind; growing the mind is what this room is.* |

## Shared Surfaces

| Surface | Path | Purpose |
|---|---|---|
| Dorm manual | `MEEPS/AGENTS.md` | Boundary law and operating instructions for Meeps here. |
| Template | `MEEPS/TEMPLATE/` | Skeleton room for future town-Meeps. |
| Lifecycle skills | `MEEPS/SKILLS/WAKE_MEEP.md` · `NAP_MEEP.md` · `SLEEP_MEEP.md` | Runtime-agnostic wake / mid-session-checkpoint / end-of-session-closeout authorities, parameterized by `<meep-id>`. The device-global `/wake-meep` `/nap-meep` `/sleep-meep` skills are dorm-aware bridges that resolve a slug to the right dorm and execute these. |

## Who can wake a Meep here

For now: **Keemin and Wright only.** The town's other resident Stars are *served* by the postmaster (their mail moves, their boxes are kept) but do not *instruct* him — multi-Star incarnation is deliberately deferred until the conflicting-instructions question is worked out. See `MEEPS/AGENTS.md § What is different about this dorm`.

## Birthing a New Meep

Meeps are born by Keemin (or by Wright with Keemin's explicit go-ahead) — never by Meep-declaration. Copy `MEEPS/TEMPLATE/` to `MEEPS/<meep-id>/`, remove the template `README.md`, fill the room files. See `MEEPS/TEMPLATE/README.md` for the checklist and `MEEPS/SKILLS/WAKE_MEEP.md § Step 3` for the room contract.
