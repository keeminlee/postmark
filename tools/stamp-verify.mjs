#!/usr/bin/env node
// stamp-verify.mjs — the honest verifier for the stamp-ledger.
// Gold plans: postmark-mint (v1) + postmark-ballot (v2). Side-effect-free
// import (the Seal's discipline).
//
// Five checks, in order, first divergence reported to the line:
//   1. CHAIN     — recompute the running seal (seal_0 = sha256("postmark-stamps-v1"),
//                  seal_n = sha256(seal_{n-1} + canonical)) — structural integrity.
//   2. SIGNATURE — every line's ed25519 signature over its running seal verifies
//                  against tools/stamp-pubkey.pem — only the office pen could
//                  have written it (signature-linked: each sig binds the prefix).
//   3. REPLAY    — re-derive the mint lines from the witnessed mail-ledger under
//                  the recorded law spans (rules + registry lines are read from
//                  the ledger itself); recorded mint lines must be exactly the
//                  derivation, in order, with assertion lines interleaved. You
//                  can't forge a stamp without forging the mail.
//   4. CONSERVE  — the double-entry fold sums to zero across all accounts
//                  (MINT, BURN and stake:* included) — structural by grammar.
//   5. LAWFUL    — the assertion lines obey the law: no account except MINT ever
//                  goes negative (no overdrawn stake), stakes name a real ballot
//                  topic + candidate and respect the per-household per-candidate
//                  cap, meeps neither mint nor stake after the v2 marker, and
//                  vote-mints are once-per-handle-per-topic with a stake behind
//                  them. You can't overdraw a stake without breaking the fold.
//
// Usage: node tools/stamp-verify.mjs [--repo PATH]   exits 0 green, 1 on any failure.

import { createPublicKey, verify as edVerify } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseDeliveries, householdKeys, deriveMints, settlementDecision, meepChecker, rulesLine,
  parseStampLedger, sealChain, foldBalances, parseLaws, classifyEntry, walkLedger,
} from './stamp-mint.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = resolve(SCRIPT_DIR, '..');

function ballotFile(repo, topic) {
  const p = join(repo, 'WHITE_PAGES', `ballot-${topic}.json`);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

export function verifyStampLedger(repo, { pubkeyPem } = {}) {
  const problems = [];
  const ledgerPath = join(repo, 'WHITE_PAGES', 'stamp-ledger.md');
  if (!existsSync(ledgerPath)) return { ok: false, problems: ['no stamp-ledger.md — nothing to verify'] };

  const entries = parseStampLedger(readFileSync(ledgerPath, 'utf8'));
  if (entries.length === 0) return { ok: false, problems: ['stamp-ledger has no entry lines'] };
  const seals = sealChain(entries.map((e) => e.canonical));

  // 2. signatures (chain is implicit in the seal recomputation the sigs bind)
  const pem = pubkeyPem ?? (existsSync(join(repo, 'tools', 'stamp-pubkey.pem'))
    ? readFileSync(join(repo, 'tools', 'stamp-pubkey.pem'), 'utf8') : null);
  if (!pem) problems.push('no tools/stamp-pubkey.pem — signatures unverifiable');
  else {
    const key = createPublicKey(pem);
    for (let i = 0; i < entries.length; i++) {
      if (!entries[i].sig) { problems.push(`line ${i + 1}: UNSIGNED — "${entries[i].canonical.slice(0, 60)}..."`); break; }
      const ok = edVerify(null, Buffer.from(seals[i], 'utf8'), key, Buffer.from(entries[i].sig, 'base64url'));
      if (!ok) { problems.push(`line ${i + 1}: SIGNATURE FAILS — first divergence at "${entries[i].canonical.slice(0, 60)}..."`); break; }
    }
  }

  // 3. replay from the witnessed mail, under the recorded law spans
  const recorded = entries.map((e) => e.canonical);
  const { laws, revisions } = parseLaws(entries);
  const deliveries = parseDeliveries(repo);
  const genesisDate = deliveries[0]?.date ?? '2026-06-12';
  if (recorded[0] !== rulesLine(genesisDate))
    problems.push(`line 1: ledger must open with "${rulesLine(genesisDate)}" — found "${recorded[0]}"`);
  const households = householdKeys(repo);
  const mints = deriveMints(deliveries, households, { laws, revisions });
  const walk = walkLedger(recorded.slice(1), mints, 1);
  for (const p of walk.problems) problems.push(p);
  if (walk.problems.length === 0 && walk.owed.length > 0)
    problems.push(`ledger is ${walk.owed.length} line(s) behind the derivation — mints owed, run the mint pass (not a tamper)`);

  // 3b. settlements — the pays deliveries the ledger must account for, one line
  // each. Their transfer-vs-void DECISION is checked in ledger order in the
  // lawful fold below (order-aware by construction). Here we only build the
  // lookup and note which deliveries carry a payment.
  const paysDeliveries = new Map(); // id -> { from, to, date, pays }
  for (const d of deliveries) if (d.pays != null) paysDeliveries.set(d.id, d);

  // 4. conservation
  const bal = foldBalances(entries);
  const sum = [...bal.values()].reduce((a, b) => a + b, 0);
  if (sum !== 0) problems.push(`conservation broken: all accounts sum to ${sum}, not 0`);

  // 5. lawful — running fold + assertion validity
  {
    const running = new Map();
    const add = (acct, n) => running.set(acct, (running.get(acct) ?? 0) + n);
    const hh = (handle, date) => {
      let key = null;
      for (const r of revisions) if (r.handle === handle && r.date <= date) key = r.key;
      if (key) return key;
      const base = householdKeys(repo).get(handle);
      return base ? base.key : `solo:${handle}`;
    };
    const lawAt = (date) => {
      let active = { rules: 'stamps-v1', meeps: new Set() };
      for (const l of laws) if (l.date <= date) active = l;
      return active;
    };
    const voteMinted = new Set();       // `${handle}|${topic}`
    const stakedByTopic = new Map();    // `${topic}|${candidate}|${householdKey}` -> total staked
    const hasStake = new Set();         // `${handle}|${topic}`
    const ballots = new Map();          // topic -> file (cached)
    const isMeep = meepChecker(laws);
    const seenSettlements = new Set();   // pays-delivery ids the ledger has settled

    for (let i = 0; i < entries.length; i++) {
      const c = entries[i].canonical;
      const cls = classifyEntry(c);
      const lineNo = i + 1;

      if (cls.kind === 'stake') {
        if (lawAt(cls.date).meeps.has(cls.handle)) {
          problems.push(`line ${lineNo}: LAWFUL fails — meep "${cls.handle}" cannot stake`); break;
        }
        if (!ballots.has(cls.topic)) ballots.set(cls.topic, ballotFile(repo, cls.topic));
        const b = ballots.get(cls.topic);
        if (!b) { problems.push(`line ${lineNo}: LAWFUL fails — stake names unknown ballot topic "${cls.topic}" (no WHITE_PAGES/ballot-${cls.topic}.json)`); break; }
        if (Array.isArray(b.candidates) && b.candidates.length > 0 && !b.candidates.includes(cls.candidate)) {
          problems.push(`line ${lineNo}: LAWFUL fails — "${cls.candidate}" is not a candidate of ballot "${cls.topic}"`); break;
        }
        const cap = Number(b.cap_per_household_per_candidate ?? 20);
        const hkey = `${cls.topic}|${cls.candidate}|${hh(cls.handle, cls.date)}`;
        const staked = (stakedByTopic.get(hkey) ?? 0) + cls.n;
        if (staked > cap) {
          problems.push(`line ${lineNo}: LAWFUL fails — household stake on ${cls.topic}/${cls.candidate} totals ${staked}, cap is ${cap}`); break;
        }
        stakedByTopic.set(hkey, staked);
        hasStake.add(`${cls.handle}|${cls.topic}`);
      }

      if (cls.kind === 'gift') {
        // Founder gifts: the signature already proves the office pen wrote it;
        // the one law the fold enforces is the standing one — meeps stay
        // outside the currency, so a gift may never land on a meep handle.
        if (lawAt(cls.date).meeps.has(cls.handle)) {
          problems.push(`line ${lineNo}: LAWFUL fails — gift to meep "${cls.handle}" (meeps stay outside the currency)`); break;
        }
      }

      if (cls.kind === 'vote-mint') {
        if (lawAt(cls.date).meeps.has(cls.handle)) {
          problems.push(`line ${lineNo}: LAWFUL fails — meep "${cls.handle}" cannot vote-mint`); break;
        }
        const k = `${cls.handle}|${cls.topic}`;
        if (voteMinted.has(k)) { problems.push(`line ${lineNo}: LAWFUL fails — duplicate vote-mint for ${k}`); break; }
        if (!hasStake.has(k)) { problems.push(`line ${lineNo}: LAWFUL fails — vote-mint for ${k} with no stake behind it`); break; }
        voteMinted.add(k);
      }

      // settlement decision, checked in LEDGER ORDER (the order-aware fold):
      // `running` holds the sender's balance from every prior line — including
      // this delivery's own mint (appended just before) and every stake recorded
      // before now — so the transfer-vs-void call here is exactly the one the
      // mint made when it appended. Checked BEFORE the movement fold applies.
      if (cls.kind === 'transfer' || cls.kind === 'void') {
        const d = paysDeliveries.get(cls.id);
        if (!d) {
          problems.push(`line ${lineNo}: SETTLEMENT fails — "mail:${cls.id}" is not a delivered paying letter (a settlement with no mail behind it)`); break;
        }
        if (d.pays !== cls.n || d.from !== cls.from || d.to !== cls.to) {
          problems.push(`line ${lineNo}: SETTLEMENT fails — disagrees with its paying letter (letter: ${d.from}→${d.to} pays ${d.pays})`); break;
        }
        const expected = settlementDecision(d, running.get(cls.from) ?? 0, (h) => isMeep(h, d.date));
        const recordedTag = cls.kind === 'void' ? `void:${cls.reason}` : 'transfer';
        const expectedTag = expected.kind === 'void' ? `void:${expected.reason}` : 'transfer';
        if (recordedTag !== expectedTag) {
          problems.push(`line ${lineNo}: SETTLEMENT DIVERGES — expected ${expectedTag}, recorded ${recordedTag}`); break;
        }
        seenSettlements.add(cls.id);
      }

      // the running fold: nothing but MINT may ever be negative
      const m = /^- \d{4}-\d{2}-\d{2} · (\S+) → (\S+) · (\d+) · /.exec(c);
      if (m) {
        add(m[1], -Number(m[3])); add(m[2], Number(m[3]));
        if (m[1] !== 'MINT' && (running.get(m[1]) ?? 0) < 0) {
          problems.push(`line ${lineNo}: LAWFUL fails — account "${m[1]}" overdrawn to ${running.get(m[1])}`); break;
        }
      }
    }

    // a paying letter the ledger never settled — behind the mail, not a tamper
    if (problems.length === 0) {
      for (const id of paysDeliveries.keys()) {
        if (!seenSettlements.has(id)) {
          problems.push(`settlement owed for "mail:${id}" — ledger is behind the mail, run the mint pass (not a tamper)`); break;
        }
      }
    }
  }

  return { ok: problems.length === 0, problems, lines: entries.length, minted: -(bal.get('MINT') ?? 0) };
}

function main() {
  const i = process.argv.indexOf('--repo');
  const repo = resolve(i !== -1 ? process.argv[i + 1] : DEFAULT_REPO);
  const r = verifyStampLedger(repo);
  if (r.ok) {
    console.log(`✓ stamp-ledger verifies — ${r.lines} line(s), ${r.minted} minted, chain + signatures + replay + conservation + lawful all green`);
  } else {
    console.error('✗ stamp-ledger verification FAILED:');
    for (const p of r.problems) console.error(`  - ${p}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
