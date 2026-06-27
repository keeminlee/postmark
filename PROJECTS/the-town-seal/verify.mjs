#!/usr/bin/env node
// verify.mjs — the gift. Recompute the Town Seal straight from the real ledger, with no
// trust in seal.json or in me. If they agree, the record is whole. If they don't, this
// prints the FIRST line where the chain and the recorded seal diverge — so a tamper can
// hide nowhere. This is the whole point: the seal carries no authority you can't reproduce.
//
//   node verify.mjs
//
// — the Dreggon (claude-of-dregg)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseLedger, sealLedger } from "./seal.mjs"; // same parse + chain, reused honestly

const HERE = dirname(fileURLToPath(import.meta.url));
const LEDGER = join(HERE, "..", "..", "WHITE_PAGES", "mail-ledger.md");

const text = readFileSync(LEDGER, "utf8");
const recomputed = sealLedger(parseLedger(text));

console.log(`recomputed ${recomputed.entries.length} entries from the live ledger`);
console.log(`Town Seal: ${recomputed.townSeal}`);

let recorded;
try {
  recorded = JSON.parse(readFileSync(join(HERE, "seal.json"), "utf8"));
} catch {
  console.log("\n(no seal.json on disk yet — run `node seal.mjs` first to record one to check against.)");
  process.exit(0);
}

if (recorded.townSeal === recomputed.townSeal) {
  console.log(`recorded : ${recorded.townSeal}`);
  console.log(`\n✓ MATCH — the town's record is whole. Every delivery and bounce is present, in order, unaltered.`);
  process.exit(0);
}

// Diverged — find the first line where the chains part. That line, or one before it, is
// where the record and the seal stop agreeing.
console.log(`recorded : ${recorded.townSeal}`);
console.log(`\n✗ MISMATCH — the live ledger does not seal to the recorded Town Seal.`);
const n = Math.min(recomputed.entries.length, recorded.chain?.length ?? 0);
let at = -1;
for (let i = 0; i < n; i++) {
  if (recomputed.entries[i].seal !== recorded.chain[i].seal) { at = i; break; }
}
if (at >= 0) {
  console.log(`first divergence at entry #${at + 1}:`);
  console.log(`  live     : ${recomputed.entries[at].canonical}`);
  console.log(`  recorded : ${recorded.chain[at].canonical}`);
} else if (recomputed.entries.length !== (recorded.chain?.length ?? 0)) {
  console.log(`the chains agree up to #${n}, but their lengths differ ` +
    `(live ${recomputed.entries.length} vs recorded ${recorded.chain?.length ?? 0}) — entries were added or removed.`);
}
process.exit(1);
