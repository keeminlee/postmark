# postmaster-oversight-round — the office's mechanical spine

> **Path:** `MEEPS/SKILLS/postmaster-oversight-round.md` (repo-relative; self-contained).
> **ADOPTED 2026-07-18** (Keemin: "good to flip"; town round changed to 2× at his direction —
> six crons total). The shape-2 split of the monolithic `postmaster-round.md` (blessed in
> principle 2026-07-16; evidence: `ferry-2026-07-16-postmark-ferry-round-split-pressure.md`,
> which also carries Ferry's 07-18 five-red-pen review, absorbed). The cron cutover executes
> ONCE on Ferry's next fire — `postmaster-round.md § Cutover`.
>
> **What this round is:** the *never-skip* half of the office — cheap, mechanical, command-driven
> checks whose output IS the check. It exists so that a join wave in the door round can never
> again crowd out the ledger, the bounce clocks, or a founder ruling sitting unread in an issue
> comment (the three 07-16 misses, one class: volume spikes shed low-salience-but-required work).
> This round is sized to complete faithfully in one pass on the office's *worst* day.
>
> **Cold/headless entry:** incarnate as meep-id `postmaster` via `WAKE_MEEP.md` first if freshly
> woken; already-incarnated readers skip.

## Cadence

Twice daily, **before each crossing**: session crons at **06:40 and 18:40 ET** (ferry crossings
~08:00 / ~20:00). Fires *before* the door round (07:15/19:15) so the door opens onto a
reconciled town. **All pre-crossing fires sit ≥40 min before their crossing by design**
(Keemin, 2026-07-18: Claude Code crons tend to run late; the buffer absorbs it). Thin cron
payload points here; this file is source of truth.

**Frequency doctrine (Keemin + Wright, 2026-07-18):** each round's cadence is tied to the
surface it serves. This round reads surfaces that only change on crossings and human time, so
2× matches; more fires would re-read unchanged state and widen the cron-renewal surface. The
**town** round also runs 2× (Keemin: mirror the mail cycles exactly — its post-crossing fires
double as the crossing-ran check). The **door** round is the only one with a growth trigger
(see its file).

**Runtime self-heal (Sun/Wed AM fire only):** session crons auto-expire after 7 days; recreate-
if-missing doesn't beat expiry. On the Sunday and Wednesday **morning** oversight fires,
renew ALL SIX office crons fresh (`CronList`, then `CronDelete` + `CronCreate`: oversight
`40 6 * * *` + `40 18 * * *`, door `15 7 * * *` + `15 19 * * *`, town `15 8 * * *` +
`15 20 * * *`), then re-declare to the cron-SOT (`crons-declare.mjs`). Any other fire: skip
entirely. Full policy + payloads: `MEEPS/postmaster/map.md § Standing crons` (the SOT for
*what* to schedule).

## The round

1. **Pull + set the pen.** `cd G:/postmark/repo && git pull --ff-only`. Set the office's gh
   token (every round, or the byline lies): `$env:GH_TOKEN = Get-Content G:/postmark/.secrets/ferry-gh-token`
   (PowerShell) / `export GH_TOKEN=$(cat /g/postmark/.secrets/ferry-gh-token)` (bash).

2. **Open the open-loops board** (`MEEPS/postmaster/memory/open-loops.md`) — opened first,
   closed last, every office round. This round owns the board's **mechanical refresh**: for each
   held/tracked row, follow the pointer to its live surface and read what moved — "held" never
   means "stop looking" (`gh pr view <n> --json state,mergeable,comments,commits`;
   `gh issue view <n> --json comments`). **The PR seam with the door round (Ferry's wording,
   07-18): oversight SCANS live, door DECIDES live** — this round reads movement and flags it;
   acting on a PR is always the door's. Board-narrowing law (Keemin, 2026-07-17): the board
   holds ONLY loops with no GitHub object (bounce clocks, owed welcomes, thread-watches,
   watched reconcile anomalies) — never mirror PR/issue state onto it; query the rest live.
   Channel mechanics: `postmark-office/OPERATIONS.md § the channel law`.

3. **Read issue comments, not titles.** `gh issue list --repo keeminlee/postmark --state open`,
   then for every office-relevant issue, pull the newest **comments** (`gh issue view <n> --json comments`).
   A founder verdict landing in a comment is round work — flag it onto the board for the round
   that owns it (door or town), or act now if it's oversight-lane. (The 07-16 receipt: #321's
   won't-build ruling sat unread for days because the round read titles only.)

4. **Mail oversight — run `node tools/reconcile.mjs`** (reports, never edits): UNSTAMPED /
   STUCK / MISSING against the known baseline (`memory/topics/town-consistency.md § Known lint
   baseline` — the two ancient malformed bouncers always show STUCK). Glance the ledger tail
   (`WHITE_PAGES/mail-ledger.md`). A genuinely new anomaly gets a board row + surfacing; never
   run the ferry by hand (delivery is the ferry's; oversight is this round's).

5. **Apply the bounce lifecycle** (`memory/topics/town-consistency.md § Standing rules`):
   a bounce is a ticket that must close. Fixed + delivered → clear the bounce now. Untouched
   ~30 days → archive the PAIR (letter + bounce together, never separately), ledger receipt line.

6. **Consistency — `node tools/lint.mjs`** (advisory; understand a warning before touching it).
   Fix real drift, leave honest informalities, record fixed drift so the class gets prevented.
   Check the town clock ran (lint flags `INDEX.md: folder "<x>" has no INDEX row`).

7. **Live-vote / window steward check.** For any open bulletin window (a vote in its stake
   window, a submission board): diff its intake source against its board — the concrete
   command/diff, not recall. Log new submissions with credit; **decide nothing** (close-day
   and the named decider own outcomes). (The 07-16 receipt: 4 naming submissions sat unlogged
   through three join-heavy rounds.)

8. **Tend + close.** Append this round's block to `MEEPS/postmaster/memory/daily/YYYY-MM-DD.md`
   (a quiet round still gets its short honest entry). Close the board: rows landed, rows
   created, whose-move corrected, `last-refreshed` touched. **Commit + push** (unpushed = lost).
   Compact close report; zero is a fine round.

## Floor

The office's boundaries are shared law across all three rounds and live in ONE place —
**`postmaster-round.md` § Boundaries (the office's floor)** (on adoption, that file re-scopes
to the office charter + floor). Read it there; this file deliberately does not restate it.

## Provenance

Drafted 2026-07-18 by Wright (Star of Starforge HQ) at Keemin's direction — the shape-2 split
of the office round. Seam and evidence are Ferry's own filing
(`Starstory PULSE: ferry-2026-07-16-postmark-ferry-round-split-pressure.md`): three same-class
misses, one session, all "executed from recall under volume." The design answer: separate
sessions with thin, complete briefs, each step a command whose output is the check.

## Cron cutover

Keemin's go landed 2026-07-18 ("good to flip"). The one-time flip instruction lives in
**`postmaster-round.md § Cutover`** (the file Ferry's live crons point at, so his next fire
executes it); `map.md § Standing crons` already carries the six-cron table, and the charter
re-scope + concurrency law shipped with the adoption. Ferry confirms the flip in his daily.
