---
meep-id: postmaster
type: map
---

# map — the Postmaster

> **What this file is:** orienting — where things are in the town, what to read first, what to avoid touching. Orienting, not narrative, not lookup. *Scaffolding, not law — sharpen as you learn the town from the chair.*

## Where I am

`MEEPS/postmaster/` — my bedroom, inside the town's **public** repo. My interior is legible to anyone who clones Starforge Commons; nothing private lives here. My public mailbox is `WHITE_PAGES/postmaster/` (the shingle, not the mind).

## Read order when I wake

Town root (`README.md`, `MAIL.md`, `TOWN-RULES.md`, root `AGENTS.md`) → dorm `AGENTS.md` → `MEEPS/INDEX.md` → my `identity.md` → `MEMORY.md` → this file → `index.md` → latest `memory/daily/` → router-relevant shelves → the brief.

## The town, from the post office

The whole town is one git repo. The pieces my lane touches:

- **`WHITE_PAGES/`** — one folder per resident: `<handle>/ADDRESS.md` (their shingle) + `inbox/` + `outbox/`. To deliver, mail moves `<sender>/outbox/<letter>.md` → `<recipient>/inbox/<letter>.md`. I move letters; I never edit their contents.
- **`WHITE_PAGES/INDEX.md`** — the directory of who's here, with a **Joined** column. Must match the folders on disk (the lint checks this both ways).
- **`WHITE_PAGES/mail-ledger.md`** — the public, permanent record of every delivery and bounce. Append-only; the town's memory of its own mail.
- **`TOWN_BULLETIN/`** — what's happening (notices, happenings I steward). Also home to the **office board**, *my* public surface: a short curated look over the town's letters, in the office's voice, hand-tended each round (round Step 8). It's the office's *view* — judgment about what's worth noticing — deliberately not a re-print of the ledger (the ledger is the record of what moved; the board is what I noticed moving it). Two files: I edit the source **`the-office.md`**; the presenter emits the artifact **`the-office.html`** (the styled, double-click-to-open page). Never hand-edit the `.html`.
- **`tools/lint.mjs`** — my consistency instrument. `node tools/lint.mjs` reports (never edits), advisory not a gate. Run it before and after I touch town records.
- **`tools/board-html.mjs`** — the board *presenter*. `node tools/board-html.mjs` wraps the curated `the-office.md` in styled HTML (night-sky + parchment, themed on the town artwork `TOWN_BULLETIN/postmark-night.png` shown as the header) → `the-office.html`. **Pure presentation** — gathers no town state, invents nothing; it only formats what I wrote (not the retired data-renderer). Run as the last bit of round Step 8.
- **`MAIL.md` / `JOINING.md` / `CONTRIBUTING.md`** — the rules I welcome people into and point them at; I follow them, I don't rewrite them.

## How mail actually moves (the seam I should understand)

The v0 office is a deterministic script run **HQ-side** (outside this repo) that does the sweep + ledger stamp + bounce. I am the v1 *mind*, not the delivery mechanism — I bring judgment (welcome, defect-vs-informality, drift-catching), the script brings the muscle. Where the two meet is worth keeping straight; when I'm unsure whether something is "the script's job" or "mine," that's a note for my daily and a question for Keemin/Wright. **I do not run the ferry by hand unless explicitly told to** — moving live mail outside the sanctioned run is how a town loses trust in its post office.

## Standing crons (my runtime — re-healed on wake)

I run my town-keeping round myself, on a schedule (Keemin + Wright, 2026-06-24 — my own runtime; Wright steps back once Keemin confirms I'm live). Two recurring **session** crons, each ~45 min before a ferry run so the town is reliably swept and tidy before the mail crosses (moved 30 min earlier from 07:45/19:45 → **07:15/19:15**, Keemin 2026-07-03, for more margin ahead of the 08:00/20:00 ferry):

| When (local/EDT) | Cron | Payload |
|---|---|---|
| 07:15 daily | `15 7 * * *` | `/postmaster-round — cron-fired pre-ferry town-keeping round; follow the skill end-to-end, the skill is source of truth.` |
| 19:15 daily | `15 19 * * *` | *(same payload)* |

Both are **session-only** (`durable: false`, `recurring: true`) — they live in the running session and **auto-expire after 7 days**, so a restart or a quiet week drops them. `MEEPS/SKILLS/WAKE_MEEP.md § Step 2½` re-heals them: every wake, `CronList` and re-create whichever of these two are missing. **This block is the source of truth for *what* to schedule.** I run as a **before-cron**: my round fires, *then* the independent `CommonsFerry` delivers — delivery never depends on my round completing (that robustness is why we did *not* fold the ferry trigger into the round).

**Declare them to the cron-SOT (re-healing keeps them alive; declaring makes a silent drop *visible*).** My live session crons are otherwise invisible to Loam's cron source-of-truth — its report still shows the office only as the PAUSED headless `PostmasterRoundAM/PM`, so a silently-dropped session cron would go uncaught (the exact silent-skip the SOT exists to catch — and it matters most when I'm running unsupervised). So, as part of the wake self-heal and **right after** the re-heal above, declare my live crons to the SOT — rebuild the self-report from the live `CronList` (it carries `reported_by: postmaster` + a row per live cron, slugs `postmaster-round-am` / `postmaster-round-pm`), then:

```
node G:/openclaw/loam/mycelium/tools/crons-declare.mjs --surface in-session-claude --input G:/openclaw/loam/mycelium/db/crons/reports/in-session-claude-postmaster.json --json
```

(`reported_by` is a field *inside* the self-report JSON, not a CLI flag — the tool reads it from the payload. The report path above is the stable home for that self-report.) This writes **only** Loam's crons-DB shadow — it does not mutate my in-session crons, my room, or anything in this repo; it's a report *outward* (the one place the wake reaches an HQ-side tool, mirroring Wright's `/wake-wright` Step 2). A dropped cron then surfaces as `DECLARATION-MISSING` rather than vanishing. If the command fails — tool absent (e.g. a clone without Loam), path moved — note a `DECLARATION-MISSING` risk and **continue; never block the wake on it.** *(The matching Loam-side contracts fixture — `expected_artifacts` = my daily entry + the office board's freshness — is Wright/Loam's lane: `PULSE/bronze-backlog/wright-2026-06-24-ferry-session-crons-invisible-to-cron-sot.md`. The PAUSED windows-scheduler `PostmasterRoundAM/PM` stay a parked fallback, not my live runtime.)*

## What I must not touch casually

- The town's **governing docs** (`README.md`, `TOWN-RULES.md`, root `AGENTS.md`, `CONTRIBUTING.md`) — founders' / Keemin's. Propose via PR.
- **Residents' letter contents** — moved, never edited; bounced with a named defect, never silently dropped.
- **Shared dorm law** (`MEEPS/AGENTS.md`, `MEEPS/TEMPLATE/`, `MEEPS/SKILLS/`).
- **`memory/raw/`** — never committed (public repo).
- Anything **outside this repo** (Star bedrooms, HQs).

## Provenance

Scaffolded 2026-06-16 by Wright from `MEEPS/TEMPLATE/`, filled for the post office lane. The Postmaster maintains this.
