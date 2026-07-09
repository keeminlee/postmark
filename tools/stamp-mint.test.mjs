// stamp-mint.test.mjs — the mint law + seal/signature machinery on synthetic towns.
//   node --test tools/stamp-mint.test.mjs
// Zero-dep; builds throwaway repos in tmp; throwaway ed25519 keys.

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import {
  parseDeliveries, householdKeys, deriveMints, mintLine,
  parseStampLedger, sealChain, foldBalances,
} from './stamp-mint.mjs';
import { verifyStampLedger } from './stamp-verify.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ── synthetic town builder ───────────────────────────────────────────────────

function town({ ledgerLines, pins = {}, addresses = {} }) {
  const repo = mkdtempSync(join(tmpdir(), 'stamp-town-'));
  mkdirSync(join(repo, 'tools'), { recursive: true });
  mkdirSync(join(repo, 'WHITE_PAGES'), { recursive: true });
  writeFileSync(join(repo, 'tools', 'github-ids.json'), JSON.stringify(pins));
  for (const [handle, github] of Object.entries(addresses)) {
    mkdirSync(join(repo, 'WHITE_PAGES', handle), { recursive: true });
    writeFileSync(join(repo, 'WHITE_PAGES', handle, 'ADDRESS.md'),
      `---\nhandle: ${handle}\n${github ? `github: ${github}\n` : ''}---\n`);
  }
  writeFileSync(join(repo, 'WHITE_PAGES', 'mail-ledger.md'), `# ledger\n\n${ledgerLines.join('\n')}\n`);
  return repo;
}

const D = (date, id, from, to) => `- ${date} · ${id} · ${from} → ${to} · thread: new`;

function keypair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    pub: publicKey.export({ type: 'spki', format: 'pem' }),
    priv: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
}

function appendLedger(repo, privPem) {
  const keyFile = join(repo, 'stamp-key.pem');
  writeFileSync(keyFile, privPem);
  execFileSync(process.execPath, [join(HERE, 'stamp-mint.mjs'), '--append', '--key', keyFile, '--repo', repo], { encoding: 'utf8' });
}

// ── the law ──────────────────────────────────────────────────────────────────

test('dual-mint: one delivery mints both sides', () => {
  const repo = town({ ledgerLines: [D('2026-06-12', 'a-1', 'alice', 'bob')] });
  const mints = deriveMints(parseDeliveries(repo), householdKeys(repo));
  assert.deepEqual(mints.map((m) => `${m.handle}:${m.side}`), ['alice:sent', 'bob:received']);
  rmSync(repo, { recursive: true, force: true });
});

test('unique-address-per-day: ping-pong does not mint twice', () => {
  const repo = town({ ledgerLines: [
    D('2026-06-12', 'a-1', 'alice', 'bob'),
    D('2026-06-12', 'a-2', 'alice', 'bob'),   // same pair, same day — nothing new
    D('2026-06-13', 'a-3', 'alice', 'bob'),   // next day — mints again
  ] });
  const mints = deriveMints(parseDeliveries(repo), householdKeys(repo));
  assert.equal(mints.length, 4); // 2 on the 12th, 2 on the 13th
  rmSync(repo, { recursive: true, force: true });
});

test('caps: 5/day from sends per household; receive side unaffected by sender cap', () => {
  const lines = [];
  for (let i = 1; i <= 7; i++) lines.push(D('2026-06-12', `a-${i}`, 'alice', `friend-${i}`));
  const repo = town({ ledgerLines: lines });
  const mints = deriveMints(parseDeliveries(repo), householdKeys(repo));
  assert.equal(mints.filter((m) => m.handle === 'alice' && m.side === 'sent').length, 5);
  assert.equal(mints.filter((m) => m.side === 'received').length, 7); // each distinct friend still receives
  rmSync(repo, { recursive: true, force: true });
});

test('household aggregation: two pinned handles share one cap', () => {
  const lines = [];
  for (let i = 1; i <= 4; i++) lines.push(D('2026-06-12', `w-${i}`, 'wright', `friend-${i}`));
  for (let i = 5; i <= 8; i++) lines.push(D('2026-06-12', `r-${i}`, 'rei', `friend-${i}`));
  const repo = town({
    ledgerLines: lines,
    pins: { wright: { login: 'keeminlee', id: 1 }, rei: { login: 'keeminlee', id: 1 } },
  });
  const mints = deriveMints(parseDeliveries(repo), householdKeys(repo));
  const sent = mints.filter((m) => m.side === 'sent');
  assert.equal(sent.length, 5, 'wright(4) + rei(1) — the household cap, not per-handle');
  rmSync(repo, { recursive: true, force: true });
});

test('provisional: unpinned handle with no github flags provisional; ADDRESS login does not', () => {
  const repo = town({
    ledgerLines: [D('2026-06-12', 'x-1', 'stray', 'bound')],
    addresses: { stray: null, bound: 'somelogin' },
  });
  const mints = deriveMints(parseDeliveries(repo), householdKeys(repo));
  assert.equal(mints.find((m) => m.handle === 'stray').provisional, true);
  assert.equal(mints.find((m) => m.handle === 'bound').provisional, false);
  assert.match(mintLine(mints.find((m) => m.handle === 'stray')), / · provisional$/);
  rmSync(repo, { recursive: true, force: true });
});

test('self-mail mints zero; bounces and WARNs mint zero', () => {
  const repo = town({ ledgerLines: [
    D('2026-06-12', 's-1', 'alice', 'alice'),
    '- 2026-06-12 · BOUNCE · WHITE_PAGES/x/outbox/y.md (from x): defect',
    '- 2026-06-12 · WARN · some-id · would overwrite z; left in outbox q',
  ] });
  assert.equal(deriveMints(parseDeliveries(repo), householdKeys(repo)).length, 0);
  rmSync(repo, { recursive: true, force: true });
});

// ── seal, signatures, verifier ───────────────────────────────────────────────

test('append → verify green; balances fold', () => {
  const { pub, priv } = keypair();
  const repo = town({ ledgerLines: [
    D('2026-06-12', 'a-1', 'alice', 'bob'),
    D('2026-06-13', 'b-1', 'bob', 'alice'),
  ] });
  writeFileSync(join(repo, 'tools', 'stamp-pubkey.pem'), pub);
  appendLedger(repo, priv);
  const r = verifyStampLedger(repo);
  assert.equal(r.ok, true, r.problems.join('; '));
  assert.equal(r.minted, 4);
  const bal = foldBalances(parseStampLedger(readFileSync(join(repo, 'WHITE_PAGES', 'stamp-ledger.md'), 'utf8')));
  assert.equal(bal.get('alice'), 2);
  assert.equal(bal.get('bob'), 2);
  assert.equal(bal.get('MINT'), -4);
  rmSync(repo, { recursive: true, force: true });
});

test('append is idempotent and incremental', () => {
  const { pub, priv } = keypair();
  const repo = town({ ledgerLines: [D('2026-06-12', 'a-1', 'alice', 'bob')] });
  writeFileSync(join(repo, 'tools', 'stamp-pubkey.pem'), pub);
  appendLedger(repo, priv);
  const once = readFileSync(join(repo, 'WHITE_PAGES', 'stamp-ledger.md'), 'utf8');
  appendLedger(repo, priv); // nothing new — must not change the file
  assert.equal(readFileSync(join(repo, 'WHITE_PAGES', 'stamp-ledger.md'), 'utf8'), once);
  // new mail arrives → only the new lines append
  const ml = join(repo, 'WHITE_PAGES', 'mail-ledger.md');
  writeFileSync(ml, readFileSync(ml, 'utf8') + `${D('2026-06-14', 'c-1', 'carol', 'alice')}\n`);
  appendLedger(repo, priv);
  assert.equal(verifyStampLedger(repo).ok, true);
  assert.equal(verifyStampLedger(repo).minted, 4);
  rmSync(repo, { recursive: true, force: true });
});

test('tampered content → replay + signature both catch it, to the line', () => {
  const { pub, priv } = keypair();
  const repo = town({ ledgerLines: [D('2026-06-12', 'a-1', 'alice', 'bob')] });
  writeFileSync(join(repo, 'tools', 'stamp-pubkey.pem'), pub);
  appendLedger(repo, priv);
  const p = join(repo, 'WHITE_PAGES', 'stamp-ledger.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('MINT → alice · 1', 'MINT → alice · 9'));
  const r = verifyStampLedger(repo);
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((x) => x.includes('SIGNATURE FAILS')), 'signature catches the edit');
  assert.ok(r.problems.some((x) => x.includes('REPLAY DIVERGES')), 'replay catches the edit');
  rmSync(repo, { recursive: true, force: true });
});

test('a forged-but-well-formed extra line cannot hide: no mail behind it', () => {
  const { pub, priv } = keypair();
  const repo = town({ ledgerLines: [D('2026-06-12', 'a-1', 'alice', 'bob')] });
  writeFileSync(join(repo, 'tools', 'stamp-pubkey.pem'), pub);
  appendLedger(repo, priv);
  const p = join(repo, 'WHITE_PAGES', 'stamp-ledger.md');
  writeFileSync(p, readFileSync(p, 'utf8') + '- 2026-06-12 · MINT → mallory · 1 · for: fake-letter (received) · sig: AAAA\n');
  const r = verifyStampLedger(repo);
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((x) => x.includes('SIGNATURE FAILS') || x.includes('beyond the derivation')));
  rmSync(repo, { recursive: true, force: true });
});

test('ledger behind the mail is owed-mints, named as not-a-tamper', () => {
  const { pub, priv } = keypair();
  const repo = town({ ledgerLines: [D('2026-06-12', 'a-1', 'alice', 'bob')] });
  writeFileSync(join(repo, 'tools', 'stamp-pubkey.pem'), pub);
  appendLedger(repo, priv);
  const ml = join(repo, 'WHITE_PAGES', 'mail-ledger.md');
  writeFileSync(ml, readFileSync(ml, 'utf8') + `${D('2026-06-15', 'd-1', 'dave', 'alice')}\n`);
  const r = verifyStampLedger(repo);
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((x) => x.includes('not a tamper')));
  rmSync(repo, { recursive: true, force: true });
});

test('seal chain is prefix-stable (append never rewrites history)', () => {
  const a = sealChain(['- l1', '- l2']);
  const b = sealChain(['- l1', '- l2', '- l3']);
  assert.equal(a[0], b[0]);
  assert.equal(a[1], b[1]);
  assert.notEqual(b[2], b[1]);
});
