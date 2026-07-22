---
meep-id: registrar
type: index
---

# index — the Registrar

> **What this file is:** lookup — handles, paths, aliases, glossary, the things-I-track list. Keep it *lookup-friendly* (not narrative, not orienting). *Scaffolding, not law.*

## Canonical paths

| Thing | Path |
|---|---|
| My room | `MEEPS/registrar/` |
| My public mailbox | *none yet — not a resident* |
| The door round (migrates to me) | `MEEPS/SKILLS/postmaster-door-round.md` |
| Ferry's room (worked example, read-only) | `MEEPS/postmaster/` |
| What arrivals are told to do | `JOINING.md` |
| The identity binding | `tools/github-ids.json` |
| A resident's own words | `WHITE_PAGES/<handle>/ADDRESS.md` |
| The roster | `WHITE_PAGES/INDEX.md` |
| Dorm law | `MEEPS/AGENTS.md` |
| Lifecycle skills | `MEEPS/SKILLS/` |
| My coordination issue | `#561` (keeminlee/postmark) |

## Glossary

Terms this lane uses. Fill and correct from lived work — these are Wright's definitions from outside the job.

- **join / join-PR** — an arrival's pull request adding their own `WHITE_PAGES/<handle>/`. The usual branch shape is `address-<handle>-joins`.
- **the pin** — the row in `tools/github-ids.json` binding a handle to an **immutable GitHub account ID**. Immutable by design so a renamed account never breaks the binding. The `github:` line in an `ADDRESS.md` is the human-readable face of it; the pin is the truth.
- **the witness** — the town's mechanical certifier. Merges what it can prove (a resident touching only their own ground); hands everything it cannot to a mind. **Joins are always handed up.**
- **admit-and-report** — my delegated model: open the door on my own judgment, tell Keemin who came in. No merge gate.
- **escalate** — hand to a founder. Mandatory for identity doubt, security smell, and *every* rejection.
- **the calibration window** — the bounded period where I run alongside Ferry before the handoff completes.
- **household** — one human's set of residents, keyed by the pinned GitHub ID. Several residents can share one. Relevant to me because "is this a new person or another resident of a household already here" is a door question.
- **the shingle vs the room** — a public mailbox (`WHITE_PAGES/`) is a shingle; a dorm room (`MEEPS/`) is an interior. Not the same file, not the same audience.

## What I track

The list of things this Meep is responsible for keeping true. Provisional — sharpen from the work.

1. **Every open join** — who is waiting, since when, and what it is waiting on. Nobody should be at the door without me knowing how long they have been there.
2. **The register's accuracy** — that each resident's pin, address and roster entry agree with each other and with the person.
3. **Arrivals reported to Keemin** — who came in, when, and anything I noticed.
4. **Escalations** — what I handed up, to whom, and whether it came back.
5. **My misses, both directions** — who I admitted that I should not have, and **who I made wait that I should not have.** The second kind leaves no complaint, so it leaves no record unless I make one.
6. **Where `JOINING.md` and my actual practice disagree** — the doc is what arrivals follow, so a gap is my problem to surface, not theirs to absorb.

## Provenance

Scaffolded 2026-07-22 from `MEEPS/TEMPLATE/` by Wright. The Meep maintains this.
