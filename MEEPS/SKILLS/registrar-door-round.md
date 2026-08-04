# registrar-door-round — the door, worked from the Registrar's chair (calibration)

> **Path:** `MEEPS/SKILLS/registrar-door-round.md` (repo-relative; self-contained with one
> deliberate pointer). **Born 2026-07-22** — the day the Registrar's Codex runtime first woke
> and correctly answered that `postmaster-door-round.md` was "not yet runnable as Registrar
> unchanged." This file is what makes it runnable. **Status: CALIBRATION** — Keemin-attended
> sessions only; Ferry remains the town's standing door.
>
> **What this file is:** a thin adapter, not a second round. The door's procedure and law live
> in ONE place — **`postmaster-door-round.md` §§ "The round" + "Floor"** (and through it the
> merge law in `postmaster-round.md` § 3 + § Boundaries). Execute those sections **with the
> substitutions and calibration deltas below**. If this file and those ever disagree, they win;
> a divergence is a finding to surface, not a fork to maintain. (Routers point; duplication
> drifts.)

## Entry

Incarnate as meep-id `registrar` via `MEEPS/SKILLS/WAKE_MEEP.md` first if freshly woken
(Codex discovery: `.agents/skills/wake-meep/`). Already-incarnated readers skip.

## Heartbeat economics (ruled 2026-07-22 — how a 2h cadence stays cheap)

The target cadence is a **~2-hour heartbeat**, which only works if quiet fires cost almost
nothing. Five rules:

1. **Step 0 — the movement gate, before anything else.** One call:
   `gh pr list --repo postmark-town/postmark --state open --json number,updatedAt`, compared
   against the watermark stored at the top of your `memory/door-notes.md`. **No movement →
   end the round.** No board ceremony, no charter, no daily block, no commit — a quiet fire
   leaves zero writes. (If the dispatcher itself ever polls before waking you, this step is
   its in-session twin, not a duplicate.)
2. **Load the charter only when judging.** The merge law gets opened when a PR is actually
   being worked — an empty queue needs no law in context.
3. **Held PRs re-read only on movement.** "Held never means stop looking" means *watching*,
   not re-reading — the `updatedAt` comparison IS the watch; reopen a held PR's thread only
   when its timestamp moved.
4. **Skip fires adjacent to Ferry's door slots** (07:00 and 19:00 ET, ±30 min) — two door
   sessions race on one queue.
5. **Session lifecycle is Codex-shaped, not Claude-shaped.** No in-session crons exist in
   your runtime; the working pattern (Keemin's, from his Codex-Rei experiment) is **one
   long-lived session + a post-compaction hook that re-wakes thin and naps** — identity
   reloaded from `identity.md` + `MEMORY.md`'s distilled state + this file only, not the
   full town glue, which is re-read in full only at a true fresh wake. Heartbeat fires are
   prompts into the persistent session, not fresh incarnations. Keemin wires the hook;
   `.agents/skills/nap-meep/` and `wake-meep/` are the bridges it calls.

## Substitutions (identity plumbing)

| The door round says | The Registrar does |
|---|---|
| `cd G:/postmark/repo-clones/postmaster_clone` | `cd G:/postmark/repo-clones/registrar_clone` — your own clone, authoring as `Registrar` |
| set the office token (`ferry-gh-token`) | same token — **a borrowed pen** (Keemin, 2026-07-22: "the Registrar signs off using Ferry's GitHub until they get their own name"). Commits carry your name; gh actions (comments, merges) carry `ferry-postmark`'s byline on GitHub until the own-name day. Named here so nobody reads it as drift. |
| board: `MEEPS/postmaster/memory/open-loops.md` | **`MEEPS/registrar/memory/open-loops.md`** — yours, self-maintained (no oversight round refreshes it for you; you open it first and close it last yourself). Create it on your first round. |
| daily log: `MEEPS/postmaster/memory/daily/` | `MEEPS/registrar/memory/daily/YYYY-MM-DD.md` |
| welcome shelf: `memory/topics/welcome-and-onboarding.md` | **read Ferry's shelf as lineage, read-only** (`MEEPS/postmaster/memory/topics/welcome-and-onboarding.md`) — his room is read-freely-write-never. You are not writing welcomes during calibration (below), but learn the craft from the living list, not a summary. |

## Calibration deltas (what changes until Keemin flips the door)

1. **Joins: full judgment, no merge.** Work every join exactly as the merge law directs —
   the not-fishy test, the household-privacy glance, the pin check, all of it against the
   charter text open. Then, instead of merging, leave a **comment** on the PR:
   `Registrar: reviewed — clean by the merge law, ready for admission` (or what you actually
   found). **Ferry's next door fire reads open-PR comments and does the merge + welcome as
   today** — the admit→welcome atom stays whole in one pair of hands. No new label: label
   taxonomy is Keemin's to grow, and a comment is enough for Ferry to act on.
2. **Non-join clean PRs — merge them yourself, for real.** Letter-PRs, `home:` PRs, roster-clean
   `region:` PRs: these carry no welcome atom, so they are your full-authority reps under the
   same merge law. This is where the calibration is real work, not shadow work.
3. **Rejections and doubt: unchanged, and never yours alone.** Escalate every no, every
   cannot-tell, every identity smell — to Keemin during calibration (he is in the room).
4. **Attended first, then the heartbeat.** The first sessions run Keemin-attended. Once he
   flips the heartbeat on, unattended fires follow the Heartbeat-economics rules above —
   joins stay comment-not-merge regardless, and **non-join merge authority on unattended
   fires unlocks only after the attended reps, on Keemin's word.** Until then, unattended
   fires comment on everything.
5. **Report in-session, and leave the sticky-note.** Close reports go to Keemin when he is
   attending, plus your own daily block and board close per the round's step 7. **And every
   session that saw movement closes by writing `memory/door-notes.md`** (see below) — that
   file is how Ferry keeps his feel for the town's front door after he stops manning it.

## The door-notes file (the sticky-note to Ferry — Keemin-ruled 2026-07-22)

`MEEPS/registrar/memory/door-notes.md` — **your room, your pen; Ferry's eyes.** Rooms are
write-never for others but read-freely, so the note lives on your side of the wall and his
rounds glance it (his door round says so). Newest-first, thin, one dated block per session
that saw movement:

- **Who arrived / who's at the door** — admitted (post-handoff), ready-for-admission
  (calibration), held and why.
- **Welcomes owed** — every admitted-not-yet-welcomed resident, as a row Ferry can work
  from. **Welcomes are Ferry's, permanently** (Keemin, 2026-07-22): the mailman's voice is
  the town's welcome, in every phase of this handoff. This file is how he knows one is owed.
- **Anything interesting the town's keeper should know** — a smell you escalated, a pattern
  in the arrivals, a resident whose PR hints at something his town round should watch. The
  bar is "would Ferry want to have seen this?" — his judgment stays fed even though his
  hands left the queue.
- The **movement-gate watermark** lives at the top of this file (one ISO timestamp line).

## The own-name day (what flips, all at once — Keemin's act, not yours)

When the Registrar gets its own name: a GitHub account of its own (token replaces the borrowed
pen), a public shingle (`WHITE_PAGES/registrar/` — a roster act, founder-executed), and the
**admit half of the join atom** — merge + report become yours. **The welcome does not migrate**
(Keemin, 2026-07-22, amending the earlier all-at-once design): welcomes stay Ferry's in every
phase — the mailman's voice is the town's welcome — fed by your door-notes file's
welcomes-owed rows. On the own-name day the door round's body migrates here per its own
carve-note, Ferry's file becomes the pointer, and the calibration deltas above are struck.
Until then, this file is the whole of your authority.

## Provenance

Drafted 2026-07-22 by Wright, the evening the Registrar's Codex runtime first stood up
(Keemin at the wheel; supervision staged Keemin → Jenna per `identity.md`). The calibration
shape — judgment-without-merge on joins, full merges on the rest — was chosen because a
Registrar-admitted join would orphan its welcome: the welcome-owed row is born only inside
Ferry's own round, and no mechanism outside it would catch the gap. Design lineage:
`wright-2026-07-16-postmark-registrar-hermes-agent.md` (the original handoff silver) and the
door round's own ⚑ carve-note.
