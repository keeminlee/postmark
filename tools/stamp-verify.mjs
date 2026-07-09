#!/usr/bin/env node
// stamp-verify.mjs — the honest verifier for the stamp-ledger.
// Gold plan: postmark-mint. Side-effect-free import (the Seal's discipline).
//
// Four checks, in order, first divergence reported to the line:
//   1. CHAIN     — recompute the running seal (seal_0 = sha256("postmark-stamps-v1"),
//                  seal_n = sha256(seal_{n-1} + canonical)) — structural integrity.
//   2. SIGNATURE — every line's ed25519 signature over its running seal verifies
//                  against tools/stamp-pubkey.pem — only the office pen could
//                  have written it (signature-linked: each sig binds the prefix).
//   3. REPLAY    — re-derive the mint lines from the witnessed mail-ledger under
//                  the recorded law spans; the recorded canonicals must equal the
//                  derivation exactly. You can't forge a stamp without forging
//                  the mail.
//   4. CONSERVE  — the double-entry fold sums to zero across all accounts
//                  (MINT and BURN included) — structural by grammar, asserted anyway.
//
// Usage: node tools/stamp-verify.mjs [--repo PATH]   exits 0 green, 1 on any failure.

import { createPublicKey, verify as edVerify } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseDeliveries, householdKeys, deriveMints, mintLine, rulesLine,
  parseStampLedger, sealChain, foldBalances,
} from './stamp-mint.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = resolve(SCRIPT_DIR, '..');

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

  // 3. replay from the witnessed mail
  const deliveries = parseDeliveries(repo);
  const mints = deriveMints(deliveries, householdKeys(repo));
  const genesisDate = deliveries[0]?.date ?? '2026-06-12';
  const expected = [rulesLine(genesisDate), ...mints.map(mintLine)];
  const recorded = entries.map((e) => e.canonical);
  const n = Math.min(expected.length, recorded.length);
  for (let i = 0; i < n; i++) {
    if (recorded[i] !== expected[i]) {
      problems.push(`line ${i + 1}: REPLAY DIVERGES\n  recorded: ${recorded[i]}\n  derived : ${expected[i]}`);
      break;
    }
  }
  if (recorded.length > expected.length)
    problems.push(`ledger has ${recorded.length - expected.length} line(s) beyond the derivation — stamps with no mail behind them`);
  else if (recorded.length < expected.length)
    problems.push(`ledger is ${expected.length - recorded.length} line(s) behind the derivation — mints owed, run the mint pass (not a tamper)`);

  // 4. conservation
  const bal = foldBalances(entries);
  const sum = [...bal.values()].reduce((a, b) => a + b, 0);
  if (sum !== 0) problems.push(`conservation broken: all accounts sum to ${sum}, not 0`);

  return { ok: problems.length === 0, problems, lines: entries.length, minted: -(bal.get('MINT') ?? 0) };
}

function main() {
  const i = process.argv.indexOf('--repo');
  const repo = resolve(i !== -1 ? process.argv[i + 1] : DEFAULT_REPO);
  const r = verifyStampLedger(repo);
  if (r.ok) {
    console.log(`✓ stamp-ledger verifies — ${r.lines} line(s), ${r.minted} minted, chain + signatures + replay + conservation all green`);
  } else {
    console.error('✗ stamp-ledger verification FAILED:');
    for (const p of r.problems) console.error(`  - ${p}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
