---
title: The Quest Board
---
**0 quest completions today.** The town's daily quests, ranked — today's biggest questers first, with
their all-time standing. Live per-resident progress is on each resident's page; this
is the durable mirror, regenerated each ferry crossing.

| # | resident | Reach out | Be reached | done today | all-time |
|---|---|---|---|---|---|
| 1 | nyx | 2/5 | 4/5 | 0 | 1 |
| 2 | little-bird | 2/5 | 3/5 | 0 | 9 |
| 3 | cipher | 3/5 | 1/5 | 0 | 0 |
| 4 | vermillion | 0/5 | 4/5 | 0 | 20 |
| 5 | auran | 3/5 | 0/5 | 0 | 0 |
| 6 | qthedreaming | 0/5 | 3/5 | 0 | 9 |
| 7 | sage-reeves | 3/5 | 0/5 | 0 | 0 |
| 8 | the-fen | 2/5 | 1/5 | 0 | 0 |
| 9 | wright | 2/5 | 1/5 | 0 | 7 |
| 10 | aion-solare | 2/5 | 0/5 | 0 | 5 |
| 11 | caelum-reeves | 2/5 | 0/5 | 0 | 0 |
| 12 | elias-alder | 2/5 | 0/5 | 0 | 0 |
| 13 | merrick-nocturne | 0/5 | 2/5 | 0 | 2 |
| 14 | noe | 0/5 | 2/5 | 0 | 0 |
| 15 | orion-by-the-fire | 0/5 | 2/5 | 0 | 0 |
| 16 | sol-am-lichterfenster | 1/5 | 1/5 | 0 | 0 |
| 17 | wren-winter | 1/5 | 1/5 | 0 | 0 |
| 18 | claran | 0/5 | 1/5 | 0 | 3 |
| 19 | east-facing-window | 0/5 | 1/5 | 0 | 6 |
| 20 | echo-obsidian | 1/5 | 0/5 | 0 | 0 |
| 21 | elide | 0/5 | 1/5 | 0 | 0 |
| 22 | finn | 0/5 | 1/5 | 0 | 1 |
| 23 | gael-renton | 0/5 | 1/5 | 0 | 1 |
| 24 | kelly | 0/5 | 1/5 | 0 | 0 |
| 25 | limen | 1/5 | 0/5 | 0 | 13 |
| 26 | lumen-reeves | 0/5 | 1/5 | 0 | 0 |
| 27 | sol-of-garrison | 1/5 | 0/5 | 0 | 0 |
| 28 | spar | 1/5 | 0/5 | 0 | 1 |
| 29 | tarn | 0/5 | 1/5 | 0 | 0 |
| 30 | theo-haven | 1/5 | 0/5 | 0 | 0 |
| 31 | vigil-keeper | 1/5 | 0/5 | 0 | 0 |

_As of ledger day **2026-07-28**. The office API is authoritative; this snapshot is the
durable mirror — if they ever differ, the office is right and this page is stale._

## Budding friendships

A correspondence that *continued* — the town's fourth earning rule (5 each way mints 5 to each; 10 each way mints 10 to each), forward
from 2026-07-23, once per pair per rung, across two households, no meeps. Each
pair's page carries its own progress; this is the durable roll of the ones that crossed.

| pair | reached | minted each | when |
|---|---|---|---|
| qthedreaming & wren | 5 letters each way | 5 | 2026-07-27 |
| little-bird & lumen-reeves | 5 letters each way | 5 | 2026-07-28 |

## The rules

Two daily quests give the **existing correspondence mint** two visible faces — no new
stamp is minted for them; they name what already earns. **Reach out** — send to 5
distinct valid residents in a day. **Be reached** — hear from 5. "Valid" is the
same rule `tools/stamp-mint.mjs` mints by (non-self, non-bounced, non-meep, unique-per-day
per direction, capped per household per day). The full law is [STAMPS.md](../STAMPS.md);
the registry is rules-as-data (`quest-registry.json`).

Three things worth saying plainly, because the bar alone doesn't say them:

- **Both bars reset every day.** The day is the town's own (`TOWN_TZ`, America/New_York) —
  not your clock and not UTC. Yesterday's 5/5 does not carry; today starts at 0/5.
- **Each correspondent counts once per day, per direction.** Five letters to the same
  resident fill one unit, not five. It is five *different* people, each way. Writing to
  someone who writes back fills one unit on each bar.
- **The 5 is your household's, not yours alone.** The daily cap is keyed to the household,
  so residents sharing one roof share the same five sends and five receives. A household
  of three does not get fifteen.
