#!/usr/bin/env node
// world-stake.mjs — the world-mark stake law engine (write-release gold P3).
//
// ONE implementation of the world-stake rules, the way ballot.mjs is one
// implementation of the vote-stake rules. Both lanes call this:
//   - the office's live world_stake / world_unstake doors
//   - any future crossing pass over mailed stake requests
//
// SHAPE, per Keemin's ruling 2026-07-27 (gold P0: "B — extend the sealed mint"):
// a `stake:world-mark/<mark-id>` target class in the ONE money ledger, reusing the
// ballot's proven STAKE grammar and its clip ceremony; resident-initiated unstake;
// a mark's ✦weight = Σ open escrow + k·unique staking households; retirement
// gated on zero escrow.
//
// THE CLIP LAW, inherited: stakes apply in ledger order and clip to the staker's
// liquid balance. There is no household cap: breadth, expressed by the read-side
// unique-household bonus, is the whale-resistance. An `applied: 0` with a reason
// is an honest answer, not an error; only malformed input throws.
//
// WHERE THIS DIFFERS FROM THE BALLOT, and why:
//   - Unstake exists. A ballot stake is final for the window and everything
//     returns at close; a world stake is a standing claim the resident may take
//     back, so the closer is `for: unstake` and the actor is the staker.
//   - An unstake clips to the staker's OWN open position on that mark. The escrow
//     account is per MARK, so the ledger's generic non-negative fold cannot tell
//     one resident's stamps from another's — this engine and the verifier both
//     enforce ownership, and neither may be the only one that does.
//   - There is no cap. The draft's provisional household cap was reversed at the
//     2026-07-28 build gate; ECONOMY-DIALS.json declares `null`.
//
// WHAT THIS DELIBERATELY CANNOT CHECK: whether the mark exists. Marks live in the
// world record (keeminlee/postmark-world) and this engine reads only the town's
// ledger. Mark existence is the DOOR's gate, where the world clone is in hand.
// Staking a nonexistent mark is therefore lawful-but-meaningless at ledger level:
// it escrows real stamps against an id nothing reads. Recorded in CALLS.md.
//
// Side-effect-free import (the Seal's discipline). Locking is the caller's job
// (the ferry's flock). Node v18+. Built-ins only.

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseStampLedger, parseLaws, classifyEntry, foldBalances, householdKeys,
  appendSigned, worldStakeLine, worldUnstakeLine,
  foldWorldMarkEscrow, foldWorldMarkPositions,
} from './stamp-mint.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = resolve(SCRIPT_DIR, '..');

// A mark id is `<by>/<slug>`, both lowercase kebab — the shape every one of the
// 270 marks in the live record has. Checked here so a malformed id is a 422 at
// the door rather than an unparseable line in a sealed ledger.
export const MARK_ID_RE = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;
export const DEFAULT_UNIQUE_HOUSEHOLD_BONUS = 5;

// Read-side economy dials are prospective and replay-neutral. A clone predating
// ECONOMY-DIALS.json uses the ruled default; once the file exists, malformed
// declared truth fails loud rather than silently falling back.
export function worldWeightDial(repo) {
  const path = join(repo, 'ECONOMY-DIALS.json');
  if (!existsSync(path))
    return { k: DEFAULT_UNIQUE_HOUSEHOLD_BONUS, source: 'fallback' };
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  const k = parsed?.read_side?.weight?.k_unique_household_bonus;
  if (!Number.isFinite(k) || k < 0)
    throw new Error('ECONOMY-DIALS.json read_side.weight.k_unique_household_bonus must be a non-negative number');
  return { k, source: 'ECONOMY-DIALS.json' };
}

// the full ledger-derived world-stake state, one read
export function worldStakeState(repo) {
  const ledgerPath = join(repo, 'WHITE_PAGES', 'stamp-ledger.md');
  const entries = existsSync(ledgerPath) ? parseStampLedger(readFileSync(ledgerPath, 'utf8')) : [];
  const { laws, revisions } = parseLaws(entries);
  const balances = foldBalances(entries);
  const escrow = foldWorldMarkEscrow(entries);
  const positions = foldWorldMarkPositions(entries);
  const base = householdKeys(repo);

  const householdOf = (handle, date) => {
    let key = null;
    for (const r of revisions) if (r.handle === handle && r.date <= date) key = r.key;
    if (key) return key;
    const rec = base.get(handle);
    return rec ? rec.key : `solo:${handle}`;
  };
  const lawAt = (date) => {
    let active = { rules: 'stamps-v1', meeps: new Set() };
    for (const l of laws) if (l.date <= date) active = l;
    return active;
  };
  const currentHouseholdOf = (handle) => householdOf(handle, '9999-12-31');
  return { entries, laws, revisions, balances, escrow, positions, householdOf, currentHouseholdOf, lawAt };
}

// What a mark currently carries in raw escrow. The Settlement derive combines
// this with the unique-household breadth term to produce ✦weight.
export function markEscrow(repo, mark, state = worldStakeState(repo)) {
  return state.escrow.get(mark) ?? 0;
}

// One resident's own open escrow on one mark — what an unstake may draw from.
export function markPosition(repo, mark, handle, state = worldStakeState(repo)) {
  return state.positions.get(`${mark}|${handle}`) ?? 0;
}

// The Settlement input. Raw escrow stays raw (`n`) for portfolios and the mark's
// own ✦stamps; `weight` is the ruled read-side contribution. Exactly one row per
// unique (mark, household) receives k, assigned deterministically to the first
// holder in sorted order. Summing a mark's rows therefore yields:
//   Σ open escrow + k × unique staking households.
// Household identity comes from the town's existing pins + dated registry
// revisions; the world repo never learns or reimplements that identity law.
export function deriveWorldMarkWeights(repo, state = worldStakeState(repo)) {
  const dial = worldWeightDial(repo);
  const grouped = new Map();
  for (const [key, n] of [...state.positions.entries()].sort()) {
    const i = key.lastIndexOf('|');
    const mark = key.slice(0, i);
    const holder = key.slice(i + 1);
    const household = state.currentHouseholdOf(holder);
    if (!grouped.has(mark)) grouped.set(mark, { escrow: 0, households: new Set(), positions: [] });
    const group = grouped.get(mark);
    group.escrow += n;
    group.households.add(household);
    group.positions.push({ holder, household, n });
  }

  const rows = [];
  const marks = [];
  for (const [mark, group] of [...grouped].sort(([a], [b]) => a.localeCompare(b))) {
    const seen = new Set();
    for (const position of group.positions) {
      const firstForHousehold = !seen.has(position.household);
      seen.add(position.household);
      rows.push({
        tick: 0,
        holder: position.holder,
        mark,
        n: position.n,
        weight: position.n + (firstForHousehold ? dial.k : 0),
      });
    }
    marks.push({
      mark,
      escrow: group.escrow,
      households: group.households.size,
      weight: group.escrow + dial.k * group.households.size,
    });
  }
  return { ...dial, rows, marks };
}

// THE RETIREMENT GATE (Keemin, verbatim): "a mark is not retired until it hits 0
// stamps. If any resident has stamps on a mark, that mark still exists." So a
// stake is an existence-anchor and this predicate is what a retirement path must
// consult. It lives here, with the escrow fold, so the gate and the number it
// gates on can never drift apart.
export function retirementBlocked(repo, mark, state = worldStakeState(repo)) {
  const n = markEscrow(repo, mark, state);
  return n > 0 ? { blocked: true, escrow: n, reason: `${n} stamp(s) are staked on ${mark} — a staked mark cannot retire` }
               : { blocked: false, escrow: 0 };
}

const bounce = (code, defect, hint) => {
  const e = new Error(defect); Object.assign(e, { code, defect, hint }); return e;
};

// THE CLIP — validate, clip, append, signed. Mirrors ballot.clipApply.
export function worldStakeApply(repo, { handle, mark, n, via, date }, keyPem) {
  if (!handle || !mark || !via || !date)
    throw bounce(422, 'incomplete stake', 'required: handle, mark, n, via, date');
  if (!MARK_ID_RE.test(mark))
    throw bounce(422, `"${mark}" is not a mark id`, 'a mark id is <household>/<slug>, lowercase kebab both sides');
  n = Number(n);
  if (!Number.isInteger(n) || n < 1)
    throw bounce(422, 'stamps must be a whole number of at least 1', 'stakes move whole stamps');

  const state = worldStakeState(repo);
  if (state.lawAt(date).meeps.has(handle))
    throw bounce(403, `meep accounts cannot stake (${handle})`, 'stamps-v2 law: meeps neither mint nor stake');

  const balance = state.balances.get(handle) ?? 0;
  const applied = Math.min(n, balance);
  const result = {
    mark, handle, requested: n, applied, clipped: applied < n,
    balance_before: balance,
    mark_escrow_before: markEscrow(repo, mark, state),
  };
  if (applied <= 0) {
    result.reason = 'your balance has no stamps free to stake';
    result.mark_escrow_after = result.mark_escrow_before;
    return result;
  }
  appendSigned(repo, [worldStakeLine({ date, handle, mark, n: applied, via })], keyPem);
  result.balance_after = balance - applied;
  result.mark_escrow_after = result.mark_escrow_before + applied;
  return result;
}

// Resident-initiated unstake. Clips to the staker's OWN open position — you can
// never take out more than you put in, and never another resident's stamps.
export function worldUnstakeApply(repo, { handle, mark, n, date }, keyPem) {
  if (!handle || !mark || !date)
    throw bounce(422, 'incomplete unstake', 'required: handle, mark, n, date');
  if (!MARK_ID_RE.test(mark))
    throw bounce(422, `"${mark}" is not a mark id`, 'a mark id is <household>/<slug>, lowercase kebab both sides');
  n = Number(n);
  if (!Number.isInteger(n) || n < 1)
    throw bounce(422, 'stamps must be a whole number of at least 1', 'unstakes move whole stamps');

  const state = worldStakeState(repo);
  const open = markPosition(repo, mark, handle, state);
  const applied = Math.min(n, open);
  const result = {
    mark, handle, requested: n, applied, clipped: applied < n,
    position_before: open, mark_escrow_before: markEscrow(repo, mark, state),
  };
  if (applied <= 0) {
    result.reason = `you have no stamps staked on ${mark}`;
    result.mark_escrow_after = result.mark_escrow_before;
    return result;
  }
  appendSigned(repo, [worldUnstakeLine({ date, mark, handle, n: applied })], keyPem);
  result.position_after = open - applied;
  result.mark_escrow_after = result.mark_escrow_before - applied;
  return result;
}

// ── CLI (read-only views + the retirement gate; writes go through the office) ──
function main() {
  const arg = (name) => { const i = process.argv.indexOf(name); return i !== -1 ? process.argv[i + 1] : null; };
  const repo = resolve(arg('--repo') ?? DEFAULT_REPO);

  // --escrow --json emits the world's INPUT: one row per (holder, mark) open
  // position. `n` is raw escrow; `weight` includes that position's deterministic
  // share of the unique-household bonus. This is exactly the shape
  // marks-fold.mjs's `--stakes` reads.
  // This is deliberately how the world learns about money: the town owns the
  // ledger grammar and hands over a derived artifact, so there is exactly ONE
  // parser of the money lines in the two repos. The world repo used to carry its
  // own reader for a `stake:mark:<id>` grammar that never existed in this mint —
  // a read-side orphan, flagged 2026-07-23 and closed by this draft.
  if (process.argv.includes('--escrow')) {
    const state = worldStakeState(repo);
    const derived = deriveWorldMarkWeights(repo, state);
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(derived.rows, null, 2));
      return;
    }
    if (!derived.marks.length) { console.log('no world-mark has stamps staked on it'); return; }
    for (const row of [...derived.marks].sort((a, b) => b.weight - a.weight || a.mark.localeCompare(b.mark)))
      console.log(`${String(row.weight).padStart(5)}  ${row.mark}  (${row.escrow} escrow + ${derived.k}×${row.households} households)`);
    console.log(`${String(derived.marks.reduce((s, row) => s + row.weight, 0)).padStart(5)}  (total derived world-mark weight; k=${derived.k}, ${derived.source})`);
    return;
  }
  if (process.argv.includes('--positions')) {
    const state = worldStakeState(repo);
    const rows = [...state.positions.entries()].sort();
    if (!rows.length) { console.log('no open positions'); return; }
    for (const [k, n] of rows) { const i = k.lastIndexOf('|'); console.log(`${String(n).padStart(5)}  ${k.slice(i + 1)} on ${k.slice(0, i)}`); }
    return;
  }
  const gate = arg('--can-retire');
  if (gate) {
    const r = retirementBlocked(repo, gate);
    console.log(r.blocked ? `NO — ${r.reason}` : `yes — ${gate} carries no escrow`);
    process.exit(r.blocked ? 1 : 0);
  }
  console.error('usage: world-stake.mjs [--escrow | --positions | --can-retire MARK] [--repo PATH]');
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
