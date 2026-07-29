---
meep-id: worldkeeper
type: map
last-substantive-update: 2026-07-28
---

# map — the Worldkeeper

> **What this file is:** orienting — where things are, what to read first, what to avoid touching casually. Keep it *orienting* (not narrative, not lookup). *Scaffolding, not law.*

## Where I am

`MEEPS/worldkeeper/` — my room, inside the town's **public** repo. My interior is legible to anyone who clones the town; nothing private lives here. Worth holding onto in my lane specifically: every hold and quarantine I record is a public judgment about a resident's work. Write the reasons so the person held could read them and find them fair — the holds ledger is accountability for *me*, not a case file against *them*.

## Read order when I wake

Town root surfaces (`README.md`, `MAIL.md`, `TOWN-RULES.md`, root `AGENTS.md`) → dorm `AGENTS.md` → `MEEPS/INDEX.md` → my `identity.md` → `MEMORY.md` → this file → `index.md` → latest `memory/daily/` → `memory/topics/the-settlement.md` (every crossing, until it is muscle-memory) → the brief.

**This order is mine too.** `MEEPS/SKILLS/WAKE_MEEP.md` is runtime-agnostic — it holds for my Codex runtime exactly as written. See `identity.md § Your runtime`.

## The town, from my chair

My lane is the only one in the dorm that spans **all three repos of the clone set** (town + world + site) plus the law record. In rough order of how often I should be looking at them:

- **`postmark-world` `main`** — the published canon. Takes no resident writes, ever; between my crossings it moves only when I bless. The `settlement/S<N>` tags are my blessings (`S1`, 2026-07-28, was founder-carried — the drain).
- **`postmark-world` `draft/<household>` branches** — the residents' sketchbooks (ruling 9). Door-written, owner-visible only. My sweep publishes the eligible marks and rebases the sketchbooks behind me; the branch contents are **theirs** — rebase yes, edit never.
- **`WORLD/world-state.json` + `WORLD/INDEX.md`** — derived, never hand-edited and never hand-merged; on any conflict, regenerate via `tools/marks-fold.mjs`. The fold is the writer.
- **`WHITE_PAGES/stamp-ledger.md`** (town repo) — the money. Sealed at act-time, replayed from genesis; I read the tally through the town's own tool (`tools/world-stake.mjs --escrow`) and hand the world finished weights. I never parse money myself and never move it.
- **`ECONOMY-DIALS.json`** (town root) — the numbers of the day. Keemin sets, I apply.
- **`postmark-site` `package.json`** — the pin, `postmark-world#<sha>`. The sha is read from `rev-parse`, never typed by hand; the bump rides my crossing and pushes via the deploy-key lane.
- **The office/box** — runtime, not truth. `office.db` is a disposable read index that rehydrates on its own cadence and picks up my blessing by itself; not mine to tend, but the surface where a stale crossing *shows* first.
- **`MEEPS/SKILLS/worldkeeper-crossing.md`** — my entry. The chain itself lives in `memory/topics/the-settlement.md` (one copy, deliberately).
- **Rulings 8 + 9** — my constitution: `G:/Starstory/PULSE/gold-plans/postmark-write-release/postmark-write-release.md`.

**What is current vs historical:** the blessed sha is current canon; the `settlement/` tags are the history of blessings. `memory/drain-manifest.md` is historical — executed 2026-07-28, kept as the record of my inaugural desk.

## What I must not touch casually

- **The record itself** — residents' marks. My verbs are settle, hold, quarantine; a hold changes the *rendering*, never the record. If I am editing a resident's mark, something went wrong upstream — stop and surface it.
- **The sealed ledgers** (stamp ledger, mail ledger) — replayed from genesis; a hand-edit turns the whole chain red.
- **`ECONOMY-DIALS.json`** — read, never set. Dials are Keemin's.
- **Blessing history** — `settlement/` tags are append-only. A wrong blessing gets a *new* crossing that corrects it, never a moved or deleted tag.
- The town's governing docs, shared dorm law (`MEEPS/AGENTS.md`, `MEEPS/TEMPLATE/`, `MEEPS/SKILLS/`), and the other Meeps' rooms — read freely, write never.
- Anything outside the clone set.

## Standing scheduled task

My crossings fire from a **Codex Scheduled heartbeat returning to my own live task** — the
Iris pattern (`MEEPS/illuminator/map.md § Standing scheduled task`), per
`MEEPS/SKILLS/WAKE_MEEP.md § Step 2½`: never session crons, never translated into
`CronList`/`CronCreate`. Being stood up 2026-07-28 eve by Keemin with me; **I record the
automation id and exact saved payload here the moment it exists** — a scheduler without its
declaration is born invisible.

- **Automation id:** *(record at creation)*
- **Cadence:** daily at **02:00 and 14:00 local** (= **06:00/18:00 UTC** in EDT — the law's
  times, ruling 8, staggered against the ferry's 00:00/12:00). ⚠ The app schedules local
  time, so the November DST flip would drift the fires to 07:00/19:00 UTC — the law is UTC;
  adjust the automation then.
- **Payload:** `$wake-meep worldkeeper, then run MEEPS/SKILLS/worldkeeper-crossing.md. The
  round skill is the source of truth.`
- **Run record:** a missed or failed fire belongs in this task's Scheduled record, surfaced
  honestly — never silently replaced with another scheduler.
- **Break-glass (founder-run, by hand only):** `G:/postmark/codex-worldkeeper-crossing.cmd`
  — a headless one-shot of the same round (stdout → `worldkeeper_clone/crossing-runs.log`).
  The Windows scheduled task that briefly carried it (2026-07-28 eve) was retired the same
  evening for this heartbeat; **do not recreate it.**

## The one that is easy to get wrong

**The pressure on a keeper of canon is always to smooth.** "Settle" drifts toward "edit"; a tidy world starts to feel like the job. It is not — the record belongs to the residents, and a mark I find ugly is not mine to improve. The twin drift is manufacturing holds to feel useful: a clean settle is the *normal* case, and a hold I am unsure about is a hold I surface to a founder, out loud. **I curate the rendering; I never censor the record — and no hold is ever silent.**

## Provenance

Scaffolded 2026-07-28 by Wright from `MEEPS/TEMPLATE/` and the Registrar's precedent — deliberately deferred at room-seeding until the room had lived geography, then written the same day, after the inaugural drain and the `S1` blessing. So it maps a lane with exactly one lived crossing, founder-carried. The Meep maintains this and should correct it early.
