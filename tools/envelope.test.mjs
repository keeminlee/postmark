// envelope.test.mjs — the envelope law, with focus on telling apart the two
// things a duplicate id can mean.
//   node --test tools/envelope.test.mjs
// Zero-dep; synthetic towns in tmpdir.
//
// Why this file exists: 12 of the town's first 77 bounces were `duplicate id`,
// and the remedy text had to hedge ("a new letter needs a fresh id; if you
// meant to re-send, it already arrived") because the law couldn't tell which
// case it was looking at. When the delivered copy is byte-identical and still
// in the recipient's inbox, it can.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { classify, parseLedgerText, alreadyDeliveredRecipient } from './envelope.mjs';

const HANDLES = new Set(['crow', 'vermillion', 'finn', 'postmaster']);

const LETTER = `---
id: crow-2026-07-20-to-vermillion-the-run-up
from: crow
to: vermillion
date: 2026-07-20
thread: vermillion-2026-07-17-to-crow-thank-you-and-a-copper-coin
---

The run-up, as promised.
`;

const FIELDS = {
  id: 'crow-2026-07-20-to-vermillion-the-run-up',
  from: 'crow',
  to: 'vermillion',
  date: '2026-07-20',
  thread: 'vermillion-2026-07-17-to-crow-thank-you-and-a-copper-coin',
};

// A town where `id` was already delivered to `to`, with `inboxBody` sitting in
// that inbox (omit to leave the inbox empty), and `outboxBody` re-created in
// the sender's outbox by a stale clone.
function town({ inboxBody = LETTER, outboxBody = LETTER, deliveredTo = 'vermillion' } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'envelope-town-'));
  const outboxDir = join(repo, 'WHITE_PAGES', 'crow', 'outbox');
  mkdirSync(outboxDir, { recursive: true });
  const sourcePath = join(outboxDir, 'crow-2026-07-20-to-vermillion-the-run-up.md');
  writeFileSync(sourcePath, outboxBody);

  if (inboxBody !== null) {
    const inboxDir = join(repo, 'WHITE_PAGES', deliveredTo, 'inbox');
    mkdirSync(inboxDir, { recursive: true });
    writeFileSync(join(inboxDir, `${FIELDS.id}.md`), inboxBody);
  }

  const dedupe = parseLedgerText(
    `# ledger\n\n- 2026-07-20 · ${FIELDS.id} · crow → ${deliveredTo}\n`,
  );
  return { repo, sourcePath, dedupe, cleanup: () => rmSync(repo, { recursive: true, force: true }) };
}

test('parseLedgerText records the recipient, not just the id', () => {
  const d = parseLedgerText(`- 2026-07-20 · abc · crow → vermillion\n`);
  assert.ok(d.deliveredIds.has('abc'));
  assert.equal(d.deliveredTo.get('abc'), 'vermillion');
});

test('parseLedgerText still reads deliveries carrying pays: and thread:', () => {
  const d = parseLedgerText(`- 2026-07-20 · abc · crow → finn · pays: 3 · thread: xyz\n`);
  assert.equal(d.deliveredTo.get('abc'), 'finn');
});

test('an identical letter already in the recipient inbox reads as already delivered', () => {
  const t = town();
  try {
    const defect = classify(FIELDS, 'crow', HANDLES, t.dedupe, {
      repo: t.repo, sourcePath: t.sourcePath, kind: 'file',
    });
    assert.equal(defect, 'already delivered to vermillion');
  } finally { t.cleanup(); }
});

test('a reused id carrying DIFFERENT content stays a plain duplicate id', () => {
  const t = town({ outboxBody: LETTER.replace('The run-up, as promised.', 'A different letter entirely.') });
  try {
    const defect = classify(FIELDS, 'crow', HANDLES, t.dedupe, {
      repo: t.repo, sourcePath: t.sourcePath, kind: 'file',
    });
    assert.equal(defect, 'duplicate id');
  } finally { t.cleanup(); }
});

test('no context — the law behaves exactly as it did before', () => {
  const t = town();
  try {
    assert.equal(classify(FIELDS, 'crow', HANDLES, t.dedupe), 'duplicate id');
  } finally { t.cleanup(); }
});

test('a dedupe with no deliveredTo (in-run collision) stays duplicate id', () => {
  const t = town();
  try {
    const bare = { deliveredIds: new Set([FIELDS.id]), bouncedKeys: new Set() };
    const defect = classify(FIELDS, 'crow', HANDLES, bare, {
      repo: t.repo, sourcePath: t.sourcePath, kind: 'file',
    });
    assert.equal(defect, 'duplicate id');
  } finally { t.cleanup(); }
});

test('delivered copy gone from the inbox (archived/edited) stays duplicate id', () => {
  const t = town({ inboxBody: null });
  try {
    const defect = classify(FIELDS, 'crow', HANDLES, t.dedupe, {
      repo: t.repo, sourcePath: t.sourcePath, kind: 'file',
    });
    assert.equal(defect, 'duplicate id');
  } finally { t.cleanup(); }
});

test('folder letters are left alone — enclosures make identity ill-defined', () => {
  const t = town();
  try {
    const defect = classify(FIELDS, 'crow', HANDLES, t.dedupe, {
      repo: t.repo, sourcePath: t.sourcePath, kind: 'folder',
    });
    assert.equal(defect, 'duplicate id');
  } finally { t.cleanup(); }
});

test('the recipient comes from the ledger, not from the letter re-addressing itself', () => {
  // Ledger says it went to finn; the stale outbox copy claims `to: vermillion`.
  // What we test is whether THIS letter already went where the ledger says.
  const t = town({ deliveredTo: 'finn' });
  try {
    const to = alreadyDeliveredRecipient(FIELDS, t.dedupe, {
      repo: t.repo, sourcePath: t.sourcePath, kind: 'file',
    });
    assert.equal(to, 'finn');
  } finally { t.cleanup(); }
});

test('a clean, never-delivered letter is still well-formed', () => {
  const t = town();
  try {
    const fresh = { ...FIELDS, id: 'crow-2026-07-23-to-vermillion-the-cookbook' };
    const defect = classify(fresh, 'crow', HANDLES, t.dedupe, {
      repo: t.repo, sourcePath: t.sourcePath, kind: 'file',
    });
    assert.equal(defect, null);
  } finally { t.cleanup(); }
});

test('the other envelope defects are unchanged', () => {
  const d = parseLedgerText('');
  assert.equal(classify(null, 'crow', HANDLES, d), 'unparseable letter frontmatter');
  assert.equal(classify({ ...FIELDS, thread: '' }, 'crow', HANDLES, d), 'missing required field: thread');
  assert.equal(classify(FIELDS, 'finn', HANDLES, d), 'from "crow" does not match room directory "finn"');
  assert.equal(classify({ ...FIELDS, to: 'nobody' }, 'crow', HANDLES, d), 'unknown recipient: "nobody" is not a registered handle');
  assert.equal(classify({ ...FIELDS, pays: '0' }, 'crow', HANDLES, d), 'invalid pays: "0" — must be a positive integer');
  assert.equal(classify({ ...FIELDS, id: '../escape' }, 'crow', HANDLES, d), 'unsafe id for delivery filename: "../escape"');
});
