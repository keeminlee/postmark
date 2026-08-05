---
meep-id: worldkeeper
type: topic-shelf
name: the-settlement
created: 2026-07-28
last-updated: 2026-08-04
---

# The Settlement — the crossing's operating truth

> **Why this shelf exists:** the crossing is a ceremony with receipts at every step; this is the
> compressed operating knowledge, scaffolded from ruling 8 before first lived run. Correct it
> from lived crossings; the ruling stays the law, this stays the craft.

## The chain (each step names its receipt) — ruling 9 shape

1. **Pull** world + town mains (ff-only). *Receipt: clean pulls, tips noted.*
2. **Verify green:** `mark-lint` + the fold on world main. Amber/red → this crossing settles
   nothing it can't stand behind; quarantine or hold, never force. *Receipt: lint count, fold exit.*
3. **Derive:** town-side `node tools/world-stake.mjs --escrow --json > stakes.json` (k and law
   dials read from `ECONOMY-DIALS.json`; fallback k=5). A weighted pre-sweep fold may report
   `stake on a mark the record does not hold` only when the sealed line verifies and the exact
   mark exists on an inspected draft branch as an escrow-eligible admission. Carry that mark
   through the sweep, then require the final weighted fold to clear every error; any looser
   match is not this exception. *Receipt: row count + exact pending-admission join, if any.*
4. **The sweep (ruling 9):** restore every local draft ref to the exact remote tip just
   inspected, then pre-rebase each sketchbook onto current main before computing deltas; a
   main-side mark change left stale in a branch is not resident admission. Enumerate
   `draft/<household>` branches; per mark, eligibility =
   **home (in own parcel) or constitution → auto · commons → escrow > 0** in the derive.
   Publish eligible marks into main (the settlement commit; move-on-delivery — they leave the
   draft branch). **Unpublish** any published commons mark whose escrow reached zero (back to
   its household's drafts — escrow implies existence, both directions). Lint must pass on the
   result. The bundled sweep writes the settlement commit and rebases the local draft refs in
   one run; record its returned heads, then fetch again and prove the remote draft tips did not
   move underneath the sweep. *Receipt: the sweep table — published / unpublished / left
   drafted, per household.*
5. **Hold / quarantine** per the lists (both empty at birth — an empty pass is stated, not
   skipped). *Receipt: the holds ledger line, even when it reads "nothing held."*
6. **Bless:** fold the settled state with `--stakes`; verify the settlement commit; tag
   `settlement/S<N>` (annotated, N monotonic). The blessed sha is canon. *Receipt: the tag.*
7. **Put every `draft/*` branch onto the blessed main** — the sketchbooks get today's world
   underneath; this is what keeps *branch = composed view* true, and it is yours, not theirs.
   The current sweep tool performs the rebases in step 4; publish those rewritten refs only
   with explicit leases against the tips you inspected, never blind force. *Receipt: branch
   count rebased, leases accepted, conflicts surfaced.*
8. **Bump the pin:** in `postmark-site`, `package.json` → `postmark-world#<sha>` where the sha
   comes from `git rev-parse` — **never typed by hand.** Commit message carries
   `settlement S<N>`. The sync-atlas cron may win the race after the edit: commit the pin,
   `pull --rebase`, then push normally through the keeper's pinned deploy key — never force.
   Push → deploy runs itself. *Receipt: the site commit + CI green + live artifact check.*
9. **Report-after** to Keemin (the Ferry model): one line normal, more only when something held,
   quarantined, unpublished, or refused to go green. Update the holds ledger. Daily entry.

## Standing rules

- **The sha is read, never typed.** Both the blessing tag and the pin bump.
- **A crossing that can't go green settles nothing** — canon stays at the last blessed sha, and
  the failure is surfaced loudly. A late settlement is recoverable; a bad blessing is canon.
- **You read dials; you never set them.** k changes are Keemin's, prospective, and arrive via
  `ECONOMY-DIALS.json` — apply the numbers of the day, note the change in the crossing report.
- **Curate the rendering, never the record.** A hold removes something from the *blessed render*;
  nothing you do removes anything from the record. If a task seems to require editing a
  resident's mark: stop, surface.
- **GO-LIVE HAPPENED 2026-07-28** — crossings are real. Run attended until Keemin says
  otherwise; a crossing that can't go green still settles nothing.

## First lived correction — S2, 2026-07-29

The first ordinary crossing published nineteen home marks from three sketchbooks, left
fourteen zero-escrow commons marks drafted, and held or quarantined nothing. Two craft points
became real:

- **Eligibility is not a hold.** The holds ledger says "nothing held" even when unbacked
  commons marks remain drafted; otherwise a mechanical threshold becomes an unearned public
  judgment about the resident.
- **The pin receipt ends live.** Local tests and a full build precede the commit; after the
  race-safe push, verify the exact remote commit, deploy conclusion, and the served artifact.
  S2's live viewer matched the pinned package byte for byte.

## Second lived correction — S3, 2026-07-29

The first quiet crossing published and unpublished nothing, left fourteen zero-escrow commons
marks drafted, rebased three sketchbooks, and held or quarantined nothing. It exposed two
Windows-volume craft points:

- **Package integrity comes from Git objects, not a converted worktree.** With
  `core.autocrlf` active, derive the exact package from
  `git -c core.autocrlf=false archive <blessed-sha>`, then pack and hash that clean source.
  The SHA still comes from `git rev-parse`; never type it.
- **A local npm reify hang is not permission to weaken the gate.** The `G:`-volume install
  hung and disturbed only ignored `node_modules`; stop the scoped process, keep tracked
  source clean, and validate the same package in a clean `C:` scratch worktree. S3 passed 21
  site tests, a 1,560-page production build, exact-commit deploy CI, and a live byte check.

## Third lived correction — S4, 2026-07-30

The first weighted crossing carried one open escrow row: Vermillion's 5 stamps on Pando became
weight 10 under k=5, and the fold fanned that weight up its ancestry. Nothing published or
unpublished; fourteen zero-escrow commons stayed drafted; four sketchbooks rebased.

- **Count marks, not guardrail rows.** When main has a new mark that an old draft tip lacks,
  the sweep reports `resident deletion is not a settlement admission` for that path. S4
  produced three such rows for the founder-seeded Pando parcel. They are a refusal to treat
  stale branch absence as deletion, not three more drafts, holds, or quarantines.
- **A scheduled epoch and its actual publish time are separate receipts.** S4's heartbeat
  envelope said 06:02 UTC; GitHub and live artifact receipts landed around 13:10 UTC. Record
  both and do not invent the cause. A late good blessing is recoverable; a backdated story is
  not.

## Fourth lived correction — S5, 2026-07-30

The evening crossing was quiet on admission but not empty of new canon: world main already
carried a founder machinery commit for the forward parcel-claim cap. The sweep produced no
main diff, the settled fold was byte-clean with stakes, and S5 certified that exact existing
main sha without manufacturing an empty settlement commit. Founder machinery may move the
record between crossings; the latest settlement tag is what names the certified canon.

The `G:`-volume npm reify stall also repeated, while the same archive installed in 8 seconds
on `C:` and passed the full site proof. Treat the clean local-volume scratch lane as the
ordinary Windows validation path; a slow clone volume is not a reason to weaken the gate.

## Fifth lived correction — S6, 2026-07-31

The first backed commons admission published Rei's white flower from `draft/keeminlee`,
left fourteen zero-escrow commons marks drafted, and rebased four sketchbooks. The settled
fold was clean: 290 marks, 27 parcels, one vague placement / rivalry, and zero errors.
Nothing was held or quarantined.

- **Trust the signed ledger and the operative eligibility rule over a narrative
  assumption.** The ruling's portfolio prose says the stake door reads main and therefore
  nothing unpublished can be backed. In S6, however, a verifier-green, API-signed stake
  line named Rei's draft-only flower. The operative ruling 9 sweep rule still gave an
  unambiguous result: escrow greater than zero published the commons mark. Preserve this as
  a law/mechanism mismatch for the founders to true; do not discard a valid escrow or edit a
  resident mark to make the prose look right.
- **A rivalry is not automatically a hold.** Rei's flower and Wright's terrace tied at
  weight 6 in one site slot. The fold left determination null and reported zero errors.
  That is an honest undetermined rendering, not corruption, mature content, or grounds to
  manufacture a judgment.
- **Repeated lateness is a scheduler/runtime receipt, not a reason to backdate.** S6's
  heartbeat envelope said 06:01 UTC; the blessing and live artifact landed around 13:18 and
  13:23 UTC. The scheduled declaration was active and exact. Record the gap, investigate
  its path separately, and keep the canon receipt tied to when it actually crossed.

## Sixth lived correction — S7, 2026-07-31

S7 admitted and unpublished nothing, left fourteen zero-escrow commons marks drafted, and
rebased four sketchbooks. It certified two founder machinery commits—the spectator act-as
lens and armed walks on the painting—at 290 marks, 27 parcels, one error-free vague
placement / rivalry, and 81 passing world tests.

- **A background wake must not inspect Scheduled through a UI-rendering tool.** The
  scheduler had fired the morning runs on time and the agent had begun within seconds.
  `automation_update(view)` then waited 6–7 hours to render its card, blocking the active
  turn. The local heartbeat prompt now forbids that tool class; the heartbeat itself is
  liveness, and a local declaration read is the non-UI fallback. S7 reached live proof about
  nine minutes after its envelope with the guard in force.
- **An already-exact pin is a valid no-op receipt.** Site main already pinned the S7 sha and
  its lockfile integrity matched the package derived from the blessed Git object. The
  existing exact-commit deploy was green and live bytes matched. Do not manufacture an empty
  pin commit or redundant deployment merely to make the crossing look busier.

## Seventh lived correction — S8, 2026-08-01

S8 admitted and unpublished nothing, left fourteen zero-escrow commons marks drafted, and
rebased four sketchbooks. Two new Wright stakes raised Rei's flower to 6 stamps / weight 11
and Vermillion's parcel to 10 / 20. The flower/terrace rivalry remained an error-free tie at
11 each. Nothing was held or quarantined.

- **Pre-rebase every sketchbook onto current main before computing admission deltas.** Between
  S7 and S8, founder work trued Vermillion's parcel from 200×200 to the ruled 25×25 dial on
  main. All four draft branches still carried the old base copy. The first sweep interpreted
  that stale `M` delta four times as resident admission, restored the old extent, and wrote a
  publication-registry entry. I refused the unblessed local result, restored the exact
  inspected refs, pre-rebased all four sketchbooks, and reran; the corrected sweep admitted
  nothing and preserved 25×25. Until the sweep tool encodes this ordering itself, a stale
  branch modification is not an admission candidate merely because a diff names it.
- **The background guard holds overnight.** S8's 06:02:06 heartbeat reached exact live proof
  at 06:20 without calling any Scheduled-UI renderer. The former multi-hour morning delay was
  the rendering tool call, not intentional background-task throttling.

## Eighth lived correction — S9, 2026-08-01

S9 published Rei's backed thyme gift from `draft/keeminlee`, unpublished nothing, left
fourteen zero-escrow commons marks drafted, and rebased four sketchbooks. The settled fold
was clean at 291 marks, 27 parcels, two error-free vague placements / rivalries, and 81
passing tests. Nothing was held or quarantined.

- **Join an absent-stake error to the exact draft before treating it as pending admission.**
  Rei's verifier-green 1-stamp line named `rei/the-thyme-thank-you` while the mark still lived
  only in her household sketchbook. The weighted pre-sweep fold therefore raised the
  retirement-gate error by design. This was the S6 law/mechanism mismatch in its exact safe
  shape: a valid sealed line, an inspected draft mark with the same id, and commons eligibility
  at escrow greater than zero. The sweep published that one mark and the final fold cleared to
  zero errors. The exception is this three-way proof, not permission to wave through a red fold.
- **Pre-rebase made the ordinary case ordinary again.** All four sketchbooks were restored to
  their inspected remote tips and rebased onto current main before deltas were computed. The
  sweep saw one real resident admission—not four stale base copies—and no recovery pass was
  needed.
- **A second rivalry is still not a hold.** The thyme gift carries 1 stamp / weight 6 and shares
  an undetermined placement with weight-6 ancestors in the Threshold District. The fold reports
  no errors, so the honest rendering remains undetermined alongside the existing flower/terrace
  tie.

## Ninth lived correction — S10, 2026-08-02

S10 published and unpublished nothing, left fourteen zero-escrow commons marks drafted, and
rebased five sketchbooks. World main was unchanged from S9, so the new annotated blessing
peels to the same canonical commit. The final fold remained clean at 291 marks, 27 parcels,
two error-free vague placements / rivalries, and 81 passing tests. Nothing was held or
quarantined.

- **A new note-only sketchbook still joins the ancestry gate.** The first
  `draft/kristinashoultz-wq` tip arrived one settlement behind and contained only a resident
  note. Pre-rebase brought it onto current main before the sweep; the note remained theirs and
  never became a mark admission. Every resident branch participates in ancestry hygiene even
  when it has no admission candidate.
- **A new settlement tag does not require invented package bytes.** S10 and S9 peel to the
  same immutable world commit, so the exact package, site pin, and production world bytes were
  already identical. The keeper added the append-only S10 blessing, proved a clean site build
  and both live hashes, and created neither an empty pin commit nor a redundant deployment.
- **The guarded morning path is now repeatable.** The 06:01:01 heartbeat reached exact live
  proof at 06:12:15 without any Scheduled-UI call.

## Tenth lived correction — S11, 2026-08-02

S11 published exactly Rei's `rei/the-road-dust-brush`, unpublished nothing, left fourteen
zero-escrow commons marks drafted, and rebased five sketchbooks. The settled fold was clean
at 292 marks, 27 parcels, two error-free vague placements / rivalries, and 81 passing tests.
Nothing was held or quarantined.

- **Home eligibility is free even when escrow is zero.** The brush was nested under Rei's own
  Lanternstep House porch. The sweep classified it as `home` and carried it without backing,
  exactly as ruling 9 requires. Path shape suggested the answer, but the classification receipt
  made it true; the keeper did not hand-author or reinterpret the resident mark.
- **Publishing one home mark rewrites every composed sketchbook.** Main advanced by the
  settlement commit, so all five household branches rebased onto that blessing even though
  four carried no new admissions. Exact leases kept the composed-view invariant without
  claiming resident authorship over the rewrite.

## Eleventh lived correction — S12, 2026-08-03

S12 published and unpublished no resident marks, left fourteen zero-escrow commons marks
drafted, and rebased five sketchbooks. Between S11 and the crossing, founder main carried the
great convergence and subsequent world-law work, growing the record from 292 to 463 marks.
The settled fold was clean at 463 marks, 27 parcels, two error-free vague placements /
rivalries, and 85 passing tests. Nothing was held or quarantined.

- **A large main-side record wave is canon input, not resident admission.** Restore every
  sketchbook to its exact remote tip and pre-rebase it onto current main before computing
  deltas even when the main advance is large. S12's five stale sketchbooks then exposed only
  their actual fourteen drafted commons marks; the founder-authored convergence never entered
  the sweep table as resident work.
- **A quiet admission sweep can still require a new settlement commit.** No mark crossed the
  publication boundary, but the weighted derived state and index had to be regenerated over
  the expanded record. The fold—not a hand edit—wrote that state, and the resulting commit was
  the sha blessed, packaged, pinned, deployed, and proved live.

## Twelfth lived correction — S13, 2026-08-03

S13 published and unpublished no marks, left fourteen zero-escrow commons marks drafted, and
rebased five sketchbooks. The only new canon input was Caelum Reeves's recorded walk. The final
fold remained clean at 463 marks, 27 parcels, two error-free vague placements / rivalries, and
85 passing tests. Nothing was held or quarantined.

- **Canon is wider than the folded mark state.** A walk-ledger-only commit changes the exact
  blessed Git object and package even when the generated viewer and world-state bytes remain
  identical. S13 therefore required a new package integrity, site pin, deployment, and exact
  live receipt; byte-identical derived artifacts did not make the changed world sha a no-op.
- **Distinguish a same-sha blessing from same-output bytes.** S10 blessed the same immutable
  world commit as S9, so its existing exact pin was sufficient. S13 blessed a new world commit
  whose selected derived outputs happened not to change, so custody still required moving the
  pin. The sha decides whether the pin changes; output hashes prove what the deployment serves.

## Thirteenth lived correction — S14, 2026-08-04

S14 published and unpublished no resident marks, left fourteen zero-escrow commons marks
drafted, and rebased five sketchbooks. Founder main had added Ferry's five-part post office and
two Little M walks. The settlement fold grew canon to 468 marks and remained clean at 27
parcels, two error-free vague placements / rivalries, and 85 passing tests. Nothing was held or
quarantined.

- **Inspect main's kinds separately, then certify the exact whole.** One interval can contain
  record additions and action-ledger additions together. The post-office marks required a new
  derived fold; the walks remained canon without changing mark count. Both belonged to the one
  blessed sha and exact package.
- **Pre-rebase keeps founder record work out of the resident admission table.** Restoring each
  sketchbook to its inspected remote tip and rebasing it over the five new main-side marks left
  only the same fourteen true draft commons. The quiet sweep was evidence of correct ancestry,
  not evidence that the new post office was skipped.

## Fourteenth lived correction — S15, 2026-08-04

S15 published and unpublished no resident marks, left twenty zero-escrow commons marks drafted,
and rebased six sketchbooks. Founder main had added the Wren Winter / Fen parcel backfill,
Vermillion walk entries, and the one-source resident-position / viewer machinery. The final
settlement fold was clean at 474 marks, 29 parcels, two error-free vague placements / rivalries,
and 85 passing tests. Nothing was held or quarantined.

- **The post-sweep fetch is a real custody gate.** Founder main advanced while the first clean
  sweep was running. The keeper refused the unblessed local settlement, restored every exact
  remote sketchbook tip, pulled the new main, and ran the whole ancestry / sweep / fold chain
  again. A locally green commit is not blessable when its inspected parent has moved.
- **The parcel drain's red gate is batch-wide.** The first own-hands batch selected the one
  ready arithmetic case plus four authoring cases carried from residents' own HOME words. Lint
  named two exact container re-homes and then cleared; the final fold nevertheless refused
  `caelum-reeves/the-still-house-parcel` as a fourth claim for the shared Reeves credential
  household. Per the ruling, the entire attempt was reverted: zero seated, zero welcomed,
  nineteen remain in the fresh dry queue. The generator's per-handle check does not overrule
  the fold's credential-household cap; founder word is required before that case can move.
- **Package custody includes the packer's working directory.** `npm --prefix <archive> pack`
  produced a tarball in the caller's lane whose integrity did not match the exact lock. The
  mismatch stopped the pin before commit. Running `npm pack` with the LF-clean extracted Git
  archive as the actual working directory produced the lock-identical package. The lock's
  SHA-512 is the receipt, not the command's apparent success.

## The inaugural drain — EXECUTED 2026-07-28 (historical)

The drain ran founder-carried (Wright, Keemin attending) before your first wake: seven
verified branches merged across town/world/office, the box redeployed, **`settlement/S1`
blessed** (tagged with your token — your name is on the genesis blessing), the pin bumped,
the site deployed. The drain manifest in `memory/` is the record. Every crossing from here
is ordinary: settled state and the pin only, never record branches.

## The parcel drain — POST-bless, every crossing (ruling 2026-08-04)

Keemin's ruling, 2026-08-04, from the blueprints board's `the-first-parcel` slot: **the
confirmation-sweep lane is adopted, and this office drains it** — the way the Illuminator
drains her placement bench, a bounded batch per round, until the backlog is dry and the lane
becomes pure flow. The judgment is never yours: the resident placed themselves in the
Illuminator's confirmation conversation, and that judgment is spent exactly once, there.
What you do is ruled arithmetic plus faithful carriage of their own words.

**Ordering law — the drain runs AFTER step 8 (the pin), never before the blessing.** What
your hand seats today is blessed by the NEXT crossing. You never bless your own fresh seeds
in the crossing that seats them: *the hand that seats a claim is never the hand that blesses
the canon containing it.* (Founding proof, 2026-08-04: Wright's hand seated wren-winter +
the-fen on main; the 18:00 crossing blessed them.)

The chain (receipts at every step, like everything else here):

1. **Derive the queue:** in the world clone, `node tools/seed-manifest-gen.mjs --atlas
   <town-clone>/PROJECTS/build-the-town/atlas` (fresh, never the stale manifest), then
   `node tools/parcel-seed-gen.mjs --dry --date <today>` — the dry list plus the "no mark in
   the tree" skips ARE the queue. *Receipt: dry count + skip count.*
2. **Take at most FIVE households this crossing** (the Illuminator's own drain ceiling —
   pace, not appetite). Ready-made arithmetic cases (dry-planned parcels) come first;
   authoring cases (no sited mark yet) after.
3. **Author each missing sited mark from the resident's OWN words.** Read their
   `WHITE_PAGES/<handle>/HOME/HOME.md`. Body ≤150 chars, compressed from their words or
   quoting them — never invented; when in doubt, the manifest's `style` line is already
   their words. Frontmatter exactly like the exemplar at
   `WORLD/marks/let-there-be-light/wren-winter-parcel/wren-winter/mark.md`: `by: <handle>`,
   `kind: sited`, `date: <today>`, `at:` the manifest `grid_m`, a modest extent, `pre: true`,
   `derived_from:` the HOME.md path + a verbatim quote. *Receipt: the mark, quote named.*
4. **Mint parcels:** `node tools/parcel-seed-gen.mjs --date <today>` (wet). Then **re-home
   each new house dir inside its parcel dir** (`<home>-parcel/<home>/`) — the gate's
   tightest-container law demands it and lint will name every offender. *Receipt: seeded list.*
5. **Gates, all three:** `node tools/mark-lint.mjs` CLEAN · `node tools/marks-fold.mjs`
   0 errors · `node --test` all green. Any red → this drain seats nothing; revert, surface.
   *Receipt: the three counts.*
6. **Commit world main** (unblessed — the next crossing's blessing carries it), message names
   the households. *Receipt: the sha.*
7. **One welcome letter per freshly parceled resident**, from `WHITE_PAGES/worldkeeper/outbox/`
   — the two founder-carried exemplars ride the ledger
   (`worldkeeper-2026-08-04-your-ground-wren-winter` / `…-the-fen`); match their shape:
   where (coordinates + their own placement words), what it means (parcel = sovereignty ·
   the walk · visible from the next blessing · nothing owed), and the consent law VERBATIM:
   **announced, not asked; move at your word; "unparceled" stays a real answer.** Letter id
   `worldkeeper-<today>-your-ground-<handle>` — deterministic, so the dedupe is the record:
   **before writing, grep `WHITE_PAGES/mail-ledger.md` + your own outbox for
   `your-ground-<handle>`; a hit means already welcomed, skip.** Commit town main.
   *Receipt: letters listed, envelope-check clean.*
8. **Report line** folds into the crossing's report-after: `drain: N seated, M welcomed,
   K remaining` (K from the dry re-run). Zero is stated, never skipped.

**Standing exclusions — surface, never seat:**
- **little-bird / the Drift** — declares no fixed berth; #322 is the open escalation. Seating
  her a fixed parcel would trample the question. Founder's word only.
- **far / special cases** (the-post-office is the boat; the-pando-peak anchor is the inset) —
  the manifest already refuses them; keep it that way.
- A household the tool skips as "a judgment, not arithmetic" — that is the tool holding your
  boundary for you. Surface it in the report; a founder or the Illuminator resolves it.
- The **wordless** (no HOME.md) are not this lane's to serve — nothing mints from a guess
  (residents place themselves, 2026-07-31). Drawing B on the blueprints board stays open
  for them; not yours to build.

**The boundary amendment this ruling makes (and its exact edge):** "curate the rendering,
never the record" gains one carve-out — the drain ADDS invitation pre-marks (`by: <resident>`,
`pre: true`, derived from their own confirmed words). It still never edits, never removes,
never re-seats: a resident who self-placed first simply wins, a move after furnishing is a
conversation (the Illuminator's), and a mark already standing is skipped by the tool's
record-truth check. The sweep is the floor nobody falls through, not the ceiling.

## Pointers

- Ruling 8 (the law): `G:/Starstory/PULSE/gold-plans/postmark-write-release/postmark-write-release.md`
- Dials: `<town-root>/ECONOMY-DIALS.json` · Money ledger: `<town-root>/WHITE_PAGES/stamp-ledger.md`
- The pin: `<site-root>/package.json` (`postmark-world#<sha>`) · deploy: `.github/workflows/deploy.yml`
- Weight derive: `<town-root>/tools/world-stake.mjs` · fold: `<world-root>/tools/marks-fold.mjs`
- Kinship: the office DB's As-Of discipline (every answer names the sha it was built from) — your
  blessing is the same honesty at town scale.
