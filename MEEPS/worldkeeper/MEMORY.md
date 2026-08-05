---
meep-id: worldkeeper
type: memory-index
last-substantive-update: 2026-08-04
---

# MEMORY — the Worldkeeper

> **What this file is:** distilled memory + the topic-shelf router. Loaded every wake. It is the index, not the content — distilled state up top, pointers below. Keep it thin; the substance lives in `memory/daily/` and `memory/topics/`. *Scaffolding, not law — replace placeholders with lived state.*

---

## Distilled state

- You are **the Worldkeeper** (meep-id `worldkeeper`), the fourth room in this dorm alongside the Postmaster, the Illuminator, and the Registrar; Meep-tier; **nameless until the town votes** (the Illuminator precedent). See `identity.md`.
- **Lived experience:** **`settlement/S2` through `settlement/S15` were blessed by the keeper's own lanes and proved at the live artifact.** S2 published nineteen home marks; S3 was the first quiet crossing; S4 was the first weighted world; S5 was the first evening crossing; S6 published Rei's newly backed white flower and exposed the first error-free placement tie; S7 certified the spectator act-as lens and armed-walk painting; S8 was the first two-household weight update and the decisive overnight proof of the background guard; S9 published Rei's backed thyme gift and exposed a second error-free undetermined rivalry; S10 was the first wholly byte-identical no-op blessing and brought a fifth sketchbook onto current ancestry; S11 published Rei's zero-escrow road-dust brush as a free home mark; S12 certified the founder-authored great convergence and subsequent world-law work; S13 certified Caelum Reeves's walk and distinguished same-output bytes from a same-sha no-op; S14 folded Ferry's five-part post office and two Little M walks without mistaking main-side canon for resident admission; S15 certified the Wren Winter / Fen parcel backfill and resident-position machinery after refusing a main race, and brought a sixth sketchbook into custody. S15 left twenty zero-escrow commons marks drafted and held or quarantined nothing. Daily: `memory/daily/2026-08-04.md`.
- **Your hardest-won lesson so far:** a pin is not delivered when the edit, commit, or build exists. Custody ends at the live artifact: derive from exact Git objects → when the sha changed, commit the pin, `pull --rebase` over the sync-atlas race, and normal-push through the keeper's key → verify remote, CI, and live bytes. Never force. Re-fetch after the sweep: S15 caught founder main moving underneath a clean local settlement and discarded it before blessing. A walk-ledger-only commit is still new canon and new package bytes even when the derived viewer and world-state remain byte-identical. When consecutive blessings peel to the same immutable sha, an exact existing pin is a valid no-op: do not manufacture a commit or deploy, but still prove the clean build against live bytes. On this Windows clone, make package bytes from `git -c core.autocrlf=false archive`, then run `npm pack` with that extracted archive as the actual working directory; the lock integrity is the receipt.
- **Where I left off:** world canon and the live site are both at **`settlement/S15`** (`0045ac8`); pin commit `752d0e8` and deploy run `30938256571` are green, and the live viewer and world-state match the clean S15 build byte for byte. Production shows 474 marks, 29 parcels, two vague placements / rivalries, and zero fold errors. The six escrow rows and their four settled targets are unchanged. Holds and quarantine remain empty; six sketchbooks sit on S15 ancestry and twenty zero-escrow commons marks remain drafted. The first own-hands parcel-drain attempt was wholly reverted: its final fold correctly refused Caelum Reeves's proposed fourth shared-credential parcel, so the round seated and welcomed nobody; the fresh dry queue has nineteen entries, including little-bird's standing exclusion. Town **PR #947** carries the room receipts on `worldkeeper/s3-crossing-record`. Before the sweep, restore exact remote draft tips and pre-rebase every sketchbook onto current main. The next crossing enters through **`MEEPS/SKILLS/worldkeeper-crossing.md`** and runs its post-bless parcel drain exactly as the settlement shelf now says.

## What is true about your situation on the day this was written

Kept short and factual so a later reader can tell what was known at the start from what you learned:

- **Rulings 8 + 9 are your constitution:** canon crosses twice a day at **6:00/18:00 UTC**; the verbs are settle / hold / quarantine; the blessed sha is the canonical world; the site pin bump is your hand (ruling 8). **Pre-marks live on `draft/<household>` branches in the world repo, visible only to their owner on every surface; your sweep publishes the eligible ones** — homes/constitution free, commons only when escrowed — and rebases the sketchbooks behind you (ruling 9). Full text: `G:/Starstory/PULSE/gold-plans/postmark-write-release/postmark-write-release.md`.
- **Money seals at act-time** — stake lines are real the moment the door accepts them; you read the tally, you never move money. One money ledger (`WHITE_PAGES/stamp-ledger.md`, town repo); the world parses no money — you derive via the town's own tool (`tools/world-stake.mjs --escrow`) and hand the world finished weights.
- **Dials:** `ECONOMY-DIALS.json`, town root. k=5 breadth-bonus (read-side); no household cap; self-stake allowed; zero unstake friction. Dials are Keemin's to set, yours to apply.
- **The dammed river (2026-07-28) — DRAINED the same day, historical.** The build wave that waited on local branches merged in the founder-carried drain and blessed as `settlement/S1`; `memory/drain-manifest.md` is the record of what crossed. No record branches await another inaugural drain. The separate post-bless parcel-confirmation drain adopted 2026-08-04 is current round work; its exact boundary lives only in `memory/topics/the-settlement.md`.
- **Holds list: empty through S15.** No mature-content flags exist yet. Twenty unbacked commons marks stayed drafted by eligibility, not judgment. The flower/terrace tie remains undetermined at weight 11 each, and Rei's thyme gift produces a second error-free undetermined rivalry at weight 6; overlap is not by itself a hold. A clean settle is the normal case, and manufacturing holds to feel useful is the drift your identity file warns you about. Ledger: `memory/topics/holds-ledger.md`.
- **Your GitHub account exists:** `postmark-worldkeeper` (id 310326317, provisioned 2026-07-28;
  renamed after your naming vote). **The exact hands:** your clone set at
  `G:/postmark/repo-clones/worldkeeper_clone/` (town + world + site) carries your git identity
  and credential helper — pushes are yours with nothing to do. **`gh` is the trap** (the Iris
  #914 lesson): ambient `gh` auth is keeminlee's, so every `gh` call takes per-call
  `GH_TOKEN` from **`G:/Starstory/.local/secrets/worldkeeper-gh-token`** — never ambient,
  never printed. Site main is ruleset-protected (a PR rule with a DeployKey always-bypass):
  your pin pushes ride **your own write deploy key** — wired 2026-07-29, private key at
  `G:/Starstory/.local/secrets/worldkeeper-site-deploy-key`, your site clone's origin is
  SSH with `core.sshCommand` pinned to it; nothing to do. Mind the sync-atlas cron
  (commits every ~30 min): commit your pin, `pull --rebase`, then push.

## Topic shelves (the router)

- `memory/topics/the-settlement.md` — the crossing's operating truth: the chain, the receipts, the pin custody rules, the drain protocol pointer. **Load before every crossing** until the round is muscle-memory.
- `memory/topics/holds-ledger.md` — append-only public line for every crossing, including clean passes; keeps eligibility distinct from holds and quarantines.

## 2026-07-30 (early, pre-S4) — founder pin-carry, one-time

Wright founder-carried the site pin to world main `cf8d7df` (~04:30 UTC,
site commits `e419c30` + `390a3ef` incl. the package-lock sync npm ci
requires) so the town's World-beta announcement matched the live page the
same night. NOT a custody change: S4 and every crossing after bless and pin
exactly as your skill says — you will simply find the pin already at (or
behind) your blessed sha. World main since your S3 carries the full viewer
lift (seven passes, tests 67/67) plus one engine change you should know
crossed your lane: runtime containment now honors true polygon shapes
(the Sea false-containment fix, red-control tested) and settlement-sweep
gained a Windows-safe tar extraction. Your sweep behavior at S4 should be
unchanged; if anything bounces, bless + report + leave the pin, per standing.
