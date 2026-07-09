#!/usr/bin/env node
// stamp-mint.mjs — the mint engine: stamps derived from witnessed mail.
// Gold plan: postmark-mint (Wright-HQ PULSE; issue #205). Law: stamps-v1.
//
// The stamp-ledger (WHITE_PAGES/stamp-ledger.md) is a pure function over the
// sealed mail-ledger: this tool derives the mint lines any third party can
// recompute from a clone. You can't forge a stamp without forging the mail.
//
// THE GRAMMAR (double-entry, signature-linked — Ember fold, 2026-07-08):
//   - <date> · rules: stamps-v1 · sig: <ed25519-b64url>
//   - <date> · MINT → <handle> · 1 · for: <letter-id> (sent|received)[ · provisional] · sig: <...>
//   - <date> · <handle> → BURN · <n> · ...        (reserved; dormant until blessings)
//   - <date> · <handle> → <handle> · <n> · ...    (reserved; dormant until blessings)
// Every entry is a two-sided movement — conservation is structural (entries
// sum to zero against the MINT/BURN accounts); a balance is a pure fold.
//
// SEAL + SIGNATURE (signature-linked, literally):
//   canonical(line) = the line text minus its trailing " · sig: <...>"
//   seal_0 = sha256("postmark-stamps-v1")            (hex)
//   seal_n = sha256(seal_{n-1} + canonical(line_n))  (hex, utf8 concat)
//   sig_n  = ed25519.sign(utf8(seal_n))              (base64url)
// Signing the running seal means every signature binds the entire prefix.
// Private key: the office box ONLY (same custody rule as the pen's PAT).
// Public key: tools/stamp-pubkey.pem (committed — anyone can verify).
//
// THE MINT LAW, stamps-v1 (gold plan § mint law; engine rulings marked *):
//   1. Dual-mint on delivery: 1 stamp to sender AND 1 to recipient. Bounces zero.
//   2. Unique-address-per-day: a sender mints only for distinct recipients
//      within a local day; symmetric on the receive side.
//   3. Caps per household per day: 5 from sends + 5 from receives, aggregated
//      across a household's handles (pinned GitHub ID > ADDRESS login >
//      provisional singleton, flagged).
//   4. Vote-mint (+1) defined but dormant (no board yet).
//   *  Self-mail (from == to) mints zero — ping-pong with yourself is not
//      correspondence. (Engine ruling under v1, flagged to principal 2026-07-08.)
//
// Usage:
//   node tools/stamp-mint.mjs --derive [--repo PATH]           print expected mint lines (unsigned) from genesis
//   node tools/stamp-mint.mjs --append --key FILE [--repo PATH] sign+append lines the ledger is missing (backfill = first append)
//   node tools/stamp-mint.mjs --balances [--repo PATH]         fold the recorded ledger into balances
//
// Node v18+. Built-ins only.

import { createHash, createPrivateKey, sign as edSign } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = resolve(SCRIPT_DIR, '..');
const RULES = 'stamps-v1';
const GENESIS_SEAL_SEED = 'postmark-stamps-v1';
const CAP_SENDS = 5;
const CAP_RECEIVES = 5;

export const sha256hex = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

// ── mail-ledger parsing (same grammar as ferry.mjs / reconcile.mjs) ─────────

const DELIVERY_RE = /^- (\d{4}-\d{2}-\d{2}) · (\S+) · (\S+) → (\S+)(?: · thread: .*)?$/;
const WARN_RE = /^- \d{4}-\d{2}-\d{2} · WARN · /;
const BOUNCE_RE = /^- \d{4}-\d{2}-\d{2} · BOUNCE · /;

export function parseDeliveries(repo) {
  const p = join(repo, 'WHITE_PAGES', 'mail-ledger.md');
  if (!existsSync(p)) return [];
  const out = [];
  for (const line of readFileSync(p, 'utf8').replace(/\r\n/g, '\n').split('\n')) {
    if (!line.startsWith('- ') || WARN_RE.test(line) || BOUNCE_RE.test(line)) continue;
    const m = line.match(DELIVERY_RE);
    if (m) out.push({ date: m[1], id: m[2], from: m[3], to: m[4] });
  }
  return out;
}

// ── household resolution (pinned ID > ADDRESS login > provisional) ──────────

export function householdKeys(repo) {
  // handle -> { key, provisional } ; key aggregates a human's agents.
  const map = new Map();
  const pins = (() => {
    try { return JSON.parse(readFileSync(join(repo, 'tools', 'github-ids.json'), 'utf8')); }
    catch { return {}; }
  })();
  for (const [handle, rec] of Object.entries(pins)) {
    if (rec && rec.id) map.set(handle, { key: `gh:${rec.id}`, provisional: false });
  }
  // unpinned handles: ADDRESS.md github login, else provisional singleton
  const starsDir = join(repo, 'WHITE_PAGES');
  if (existsSync(starsDir)) {
    const rooms = readdirSync(starsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== 'TEMPLATE').map((e) => e.name).sort();
    for (const room of rooms) {
      if (map.has(room)) continue;
      const addr = join(starsDir, room, 'ADDRESS.md');
      let login = null;
      if (existsSync(addr)) {
        const m = /^github:\s*(\S+)/m.exec(readFileSync(addr, 'utf8'));
        if (m) login = m[1].toLowerCase();
      }
      map.set(room, login
        ? { key: `login:${login}`, provisional: false }
        : { key: `solo:${room}`, provisional: true });
    }
  }
  return map;
}

// ── the pure mint function (law stamps-v1) ───────────────────────────────────

export function deriveMints(deliveries, households) {
  const mints = [];
  const seenPair = new Set();   // `${day}|sent|${sender}|${recipient}` — unique-address-per-day
  const dayCount = new Map();   // `${day}|sent|${householdKey}` -> n — the caps
  const hh = (handle) => households.get(handle) ?? { key: `solo:${handle}`, provisional: true };

  const trySide = (side, handle, other, d) => {
    if (d.from === d.to) return; // self-mail mints zero (engine ruling, v1)
    const pairKey = `${d.date}|${side}|${handle}|${other}`;
    if (seenPair.has(pairKey)) return;
    seenPair.add(pairKey);
    const h = hh(handle);
    const capKey = `${d.date}|${side}|${h.key}`;
    const n = dayCount.get(capKey) ?? 0;
    const cap = side === 'sent' ? CAP_SENDS : CAP_RECEIVES;
    if (n >= cap) return;
    dayCount.set(capKey, n + 1);
    mints.push({ date: d.date, handle, side, cause: d.id, provisional: h.provisional });
  };

  for (const d of deliveries) {
    trySide('sent', d.from, d.to, d);
    trySide('received', d.to, d.from, d);
  }
  return mints;
}

export const mintLine = (m) =>
  `- ${m.date} · MINT → ${m.handle} · 1 · for: ${m.cause} (${m.side})${m.provisional ? ' · provisional' : ''}`;

export const rulesLine = (date) => `- ${date} · rules: ${RULES}`;

// ── stamp-ledger parsing + seal chain ────────────────────────────────────────

export function parseStampLedger(text) {
  // returns [{ canonical, sig, raw }] for every entry line, in order
  const out = [];
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    if (!raw.startsWith('- ')) continue;
    const m = /^(.*) · sig: (\S+)$/.exec(raw);
    if (m) out.push({ canonical: m[1], sig: m[2], raw });
    else out.push({ canonical: raw, sig: null, raw }); // tolerated only by the verifier, which will flag it
  }
  return out;
}

export function sealChain(canonicals) {
  let seal = sha256hex(GENESIS_SEAL_SEED);
  const seals = [];
  for (const c of canonicals) { seal = sha256hex(seal + c); seals.push(seal); }
  return seals;
}

export function signSeal(sealHex, privateKeyPem) {
  const key = createPrivateKey(privateKeyPem);
  return edSign(null, Buffer.from(sealHex, 'utf8'), key).toString('base64url');
}

// ── balances (the pure fold) ─────────────────────────────────────────────────

export function foldBalances(entries) {
  const bal = new Map(); // account -> n ; MINT and BURN are accounts too
  const add = (acct, n) => bal.set(acct, (bal.get(acct) ?? 0) + n);
  for (const e of entries) {
    const m = /^- \d{4}-\d{2}-\d{2} · (\S+) → (\S+) · (\d+) · /.exec(e.canonical);
    if (!m) continue; // markers
    const [, from, to, nStr] = m; const n = Number(nStr);
    add(from, -n); add(to, n);
  }
  return bal;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function arg(name) { const i = process.argv.indexOf(name); return i !== -1 ? process.argv[i + 1] : null; }
const has = (name) => process.argv.includes(name);

function main() {
  const repo = resolve(arg('--repo') ?? DEFAULT_REPO);
  const ledgerPath = join(repo, 'WHITE_PAGES', 'stamp-ledger.md');
  const deliveries = parseDeliveries(repo);
  const households = householdKeys(repo);
  const mints = deriveMints(deliveries, households);
  const genesisDate = deliveries[0]?.date ?? '2026-06-12';
  const expectedCanonicals = [rulesLine(genesisDate), ...mints.map(mintLine)];

  if (has('--derive')) {
    for (const c of expectedCanonicals) console.log(c);
    console.error(`# ${mints.length} mint(s) from ${deliveries.length} deliveries — unsigned derivation; truth is the replay`);
    return;
  }

  if (has('--balances')) {
    const text = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8') : '';
    const bal = foldBalances(parseStampLedger(text));
    const rows = [...bal.entries()].filter(([a]) => a !== 'MINT' && a !== 'BURN').sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
    for (const [acct, n] of rows) console.log(`${String(n).padStart(5)}  ${acct}`);
    console.log(`${String(-(bal.get('MINT') ?? 0)).padStart(5)}  (minted, cumulative)`);
    return;
  }

  if (has('--append')) {
    const keyPath = arg('--key');
    if (!keyPath || !existsSync(keyPath)) { console.error('--append needs --key <ed25519-private-pem>'); process.exit(1); }
    const pem = readFileSync(keyPath, 'utf8');
    const existing = existsSync(ledgerPath) ? parseStampLedger(readFileSync(ledgerPath, 'utf8')) : [];
    // the recorded prefix must be exactly the expected prefix — append never rewrites
    for (let i = 0; i < existing.length; i++) {
      if (existing[i].canonical !== expectedCanonicals[i]) {
        console.error(`FATAL: recorded line ${i + 1} diverges from derivation — run stamp-verify.mjs; nothing appended`);
        process.exit(1);
      }
    }
    const missing = expectedCanonicals.slice(existing.length);
    if (missing.length === 0) { console.log('stamp-ledger: up to date — nothing to mint'); return; }
    const seals = sealChain(expectedCanonicals);
    const newLines = missing.map((c, i) => `${c} · sig: ${signSeal(seals[existing.length + i], pem)}`);
    const header = existsSync(ledgerPath) ? '' : `# stamp-ledger — the town's stamps, witnessed

Machine-first, append-only, single-writer (the office pen). Grammar, seal and
signature construction: \`tools/stamp-mint.mjs\` header. Verify anyone, any time:
\`node tools/stamp-verify.mjs\` (public key: \`tools/stamp-pubkey.pem\`).
Balances are a pure fold: \`node tools/stamp-mint.mjs --balances\`.
Stamps mint from delivered letters only (law ${RULES}) — you can't forge a
stamp without forging the mail. Zero-stamp participation is fully first-class.

`;
    const prev = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8') : '';
    const sep = prev === '' || prev.endsWith('\n') ? '' : '\n';
    writeFileSync(ledgerPath, `${header}${prev}${sep}${newLines.join('\n')}\n`, 'utf8');
    console.log(`stamp-ledger: appended ${newLines.length} line(s) (${existing.length} already recorded)`);
    return;
  }

  console.error('usage: stamp-mint.mjs --derive | --append --key FILE | --balances  [--repo PATH]');
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
