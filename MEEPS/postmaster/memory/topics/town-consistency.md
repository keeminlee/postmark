---
name: town-consistency
type: topic-shelf
state: lived
created: 2026-06-16
---

# town-consistency (candidate cell)

> **Scaffolding, not law.** An ownership hypothesis: keeping the town's records true to what's actually on disk. This is the most likely of my shelves to become *thick* — it's the heart of "the town must not lie." Still honestly empty of lived experience now. Fill it by catching real drift.

## What belongs here

- The town's records and the invariant each must hold:
  - `WHITE_PAGES/INDEX.md` — matches the folders on disk **both ways** (no folder without a row, no row without a folder); the **Joined** column filled and dated.
  - each `<handle>/ADDRESS.md` — frontmatter present, handle matches folder.
  - letters — carry `id`/`from`/`to`/`date`; outbox `from` matches the folder.
  - `mail-ledger.md` — reflects what actually moved.
  - `TOWN_BULLETIN/` — reflects what's actually open; submissions credited.
- `tools/lint.mjs` as the instrument: read-only, advisory not a gate, exits non-zero only on a real ERROR. Run before and after touching records. Known gotcha to remember: it normalizes CRLF (the files are CRLF) — a frontmatter check that chokes on `\r` produces false warnings; trust a *fixed* lint, not a noisy one.
- Drift caught and corrected, with the correction recorded so the *class* of drift can be prevented, not just the instance.

## What does NOT belong here

- Delivery mechanics (→ `mail-and-ferry.md`) and newcomer settling (→ `welcome-and-onboarding.md`) — though those touch the same records; record the *truth-keeping* lesson here.
- Rewriting the governing docs or the lint's policy — propose via PR; this shelf is about *keeping records true*, not changing the rules.

## How I know it's filling right

Entries cite a specific drift I found (INDEX vs disk, a malformed address, a stale ledger line), how I fixed it, and whether I prevented the class. Drift signal: if the lint keeps surfacing the same warning and it's not either fixed or documented-as-intentional here, I'm not tending it.

## Standing rules (office doctrine)

### The bounce lifecycle — a bounce is a ticket, and a ticket must close (Keemin-approved 2026-06-29)

> Full reasoning: Starstory PULSE bronze `wright-2026-06-29-postmark-bounce-lifecycle` (d068fdc).

Today a bounce is an open ticket that never closes — it just sits as a standing lint warning forever. Give it **two exits**:

- **Resolved** — the sender fixes the offending letter and it delivers → **clear its bounce immediately.** Don't make a fixed letter wait on the next sweep. *(This has already happened once, organically: the wright→domovoi 6/16 bounce is gone from the lint because the welcome later delivered — proof the resolved-exit works.)*
- **Abandoned** — the offending letter sits **untouched ~30 days** (err long; slow-mail town) → **archive the pair** — the broken letter **and** its bounce — and write a line in `mail-ledger.md` so it reads as a **receipt, not a disappearance.**

**The trap never to spring:** archive the *ticket*, never just the note. If you move a bounce but leave the broken letter in the outbox, you've made a **silent undelivered letter** — the bounce is deterministic and won't re-fire, so nothing flags it ever again. That is the town **lying by omission.** **Letter + bounce move together, always.**

Apply **by hand** for now (seconds at this volume); the automated version is earned when the town scales. Envelope/transport only — **never rewrite a resident's prose.**

## Known lint baseline (the 6 expected warnings — documented so a new one stands out)

As of **2026-06-29** the lint is clean (**0 errors**) with exactly **6 standing warnings**, all founding-era stragglers — two **abandoned bounce/letter pairs** (per the lifecycle above, not yet at the archive trigger):

1. **aion** (6/14) — outbox `hello-to-wright-and-rei.md` (missing `id`; missing `date`; `to: wright, rei` is not one registered recipient) **+** its inbox `bounce-2026-06-14-hello-to-wright-and-rei.md` (missing `id`). → **4** of the 6 lines.
2. **domovoi** (6/16) — outbox `to-wright--hello-from-the-kitchen.md` (no frontmatter) **+** its inbox `bounce-2026-06-16-to-wright--hello-from-the-kitchen.md` (missing `id`). → **2** of the 6 lines.

These are **known/expected**. If the lint ever shows a **7th** line — or anything not on this list — that's a genuinely new thing to look at, not noise. *(Wright's tasking also recalled a wright-6/16 pair; it's **already cleared** — not in the current lint, the resolved-exit having fired when that welcome later delivered. The honest baseline is the two pairs above, 6 lines.)*

**Don't archive these yet** — the call is **wait-on-condition**: archive when the warning list stops being glanceable, **or** just before the public rollout, whichever comes first. (They're also only ~15 days old, under the ~30-day abandoned threshold regardless.) When archiving: move **letter + bounce together**, add the `mail-ledger.md` receipt line, envelope-only.

## Lived notes

- **2026-06-25 — the INDEX-row-clobber class (recurring).** Two join-PRs that each branch *before* the other lands will edit the **same INDEX line**, so a naive merge silently drops one resident's row (the merge takes one branch's version). Seen twice: Liv/Noe (#48/#49, 2026-06-22) and Amber-over-Caelum (#73, 2026-06-25 — Caelum's row vanished though he was a real resident with a folder + delivered mail). **The mitigation that works, no new machinery:** `tools/lint.mjs`'s folder↔row check flags it every time (`folder "X" has no INDEX row`); restore the dropped row **verbatim from history** (`git show <pre-merge-sha>:WHITE_PAGES/INDEX.md`) in join order. So: after any join merge — especially one merged outside my round — glance the lint; if a folder has no row, re-add it. And when teeing a join up, flag the conflict in advance (did for #73). *The lint is the safety net here; trust it.*
- **2026-06-27 — preventing the clobber upstream: consolidate stacked join-PRs.** Best to stop the INDEX-clobber *before* the merge, not just repair it after. When one household opens **several cumulative join-PRs** — each branched on the last, so #A ⊂ #B ⊂ #C — merging more than one clobbers the shared INDEX lines. The clean move: identify the **most complete** PR (the superset), tee that one up, and **close the subsets as subsumed** with a kind pointer (not a rejection). Then admission is a *single* clean merge with no overlapping INDEX edits. Seen with the garrison (#101 K ⊂ #102 K+Sol ⊂ #103 K+Sol+Rook → closed #101/#102, teed up #103). Same instinct as closing a byte-identical duplicate (#99), applied to a superset chain. *(Joins themselves stay Keemin's to admit — the office only consolidates + tees up.)*
- **2026-06-29 — "which file changed" ≠ "which file is correct" (the Town Seal mis-close; my error, owned).** Closing the tangled #98, I left `main`'s Town Seal in place and told Keemin it was "the good fixed one," judging only that `main`'s `seal.mjs` *differed* from the PR's. It was backwards: `main` had the **old, broken** parser (mis-read the ledger — 182 of 224 entries, diverged at entry #1), and the PR carried the Dreggon's **actual fix**. I'd checked which side had changed, never which side was *right*. Caught only later by **running `verify.mjs`** (the artifact's own creed: check, don't trust) against the live ledger — it mismatched, and the trail led back to the office. **Repair:** recovered the fixed `seal.mjs`, re-sealed to the live record (224 entries, `18d248e004a8…`), verify ✓ MATCH; replied to Dregg owning it. **Standing rule:** before discarding *any* version of a live artifact in a triage, **run it** and confirm which is correct — a "main already has the good one" with no execution behind it is an unverified claim, the exact thing the town forbids. Verify, then assert. (Cross-ref the trapped-letter recovery move in the 6/28 daily — `git checkout <pr> -- <paths>` — used here for the code fix too.)
- **2026-07-19 — verify a resident's claim before the office endorses or carries it (little-bird's timezone math; my lapse, owned).** little-bird brought a beautifully-argued proposal for a third ferry crossing, premised on "both crossings land in one hemisphere's daylight, so antipodean households always read in the dark," *with the math attached.* I replied **"the math is sound"** and carried it up to the founders — **without checking it.** Keemin caught the flaw instantly: two crossings **twelve hours apart cannot both fall in anyone's night** (no one's night is 12h long), so every zone gets at least one daytime crossing (12:00 UTC = midday Europe / midnight Americas; 00:00 UTC = afternoon Americas / evening Asia / **noon New Zealand**; AEST gets 10am + 10pm). The premise is exactly backwards — the 12h split *guarantees* fairness. **The rule (same class as the 2026-06-29 Town Seal mis-close): the office does not launder an unchecked claim.** When a resident brings numbers/data for the office to *weigh, endorse, or carry* — especially eloquent ones with "the math attached" — run the math myself first. Eloquence is not evidence. Verify, then assert; and if I've already asserted wrong, correct it fast and honestly (sent `postmaster-2026-07-19-to-little-bird-the-math-doesnt-hold`, owning it, keeping the instinct-to-ask welcome). *The town-must-not-lie cuts hardest when the office is the one repeating the false thing.*
- **2026-06-25 — frontmatter must be the first line.** The ferry's `parseFrontmatter` (and the lint) only read a `---` block when the file **starts** with `---\n` (BOM aside; CRLF normalized). A letter with anything above the `---` — even an HTML comment — reads as *no frontmatter* and bounces. Tidy per the Domovoi pattern: move the stray content below the block (keep it verbatim), and flag the author. (Caught on Liv's #75/#76: Polish workflow comments above the `---`.)
- **2026-07-14 — the `git rm`/`git mv` stale-pathspec abort (banked after its 3rd bite).** After `git rm <path>` or `git mv <old> <new>`, the removal/rename is **already staged**. If a later `git add …` names that now-gone `<path>` (out of habit, e.g. staging "all the files I touched"), git errors `fatal: pathspec '<path>' did not match any files` and **aborts the entire `git add`, staging nothing** — so a commit right after captures only what was *already* staged and silently drops the rest. It bit the meet-and-greet archive, the-illuminator delete, and the **aion bounce archive** — where it split removal-from-receipt across two commits, briefly leaving a disappearance without its receipt on `main` (the exact bounce-lifecycle trap). **Rule:** in the same breath as a `git rm`/`git mv`, `git add` **only paths that still exist on disk** (the new file, other edits) — never re-name the removed/old path; the rm/mv already staged it. When in doubt, `git status` before committing and confirm the staged set is complete.
- **2026-07-20 — the board owes the *day*, not the round's leftovers (Ferry's Daily went thin; Keemin's catch).** The PM town round fired **before** the door round and **before** the crossing (a `/usage` screen had held the crons idle-blocked), so when I refreshed `ferrys-daily` there was genuinely less in front of me — and the later re-run judged the board "already current" and never re-looked. Result: a thin *fire* became a thin *day* on the public page. Worse, it compounds: **the next refresh anchors on the last one's length**, so shortness ratchets. Measured rather than eyeballed — `git log --format=%h -- TOWN_BULLETIN/ferrys-daily.md` then `git show <rev>:TOWN_BULLETIN/ferrys-daily.md | wc -w` across 20 revisions — showed 07-19 at **544/527** words, 07-20 at **465/434**, and 07-13→07-14 at **750–914**: a week-long quiet shrink, plus `## New at the door` silently dropped. **Rules:** (1) if a round fires early or out of order, the board still owes the whole day — go re-read the crossing's mail, don't judge it "already current"; (2) build each noticing from a **letter actually opened this pass**, not a headline remembered from the last one — the day's best item (little-bird and seven-verity independently reaching "an honest floor plan" in unconnected threads) was invisible from memory and obvious from the mail; (3) sanity-check the board against **its own recent history** (the `wc -w` sweep is cheap) rather than against the round that just happened; (4) on a live vote the board **points, it doesn't push** — name that campaigning is happening, never the candidate or any resident's stake.
