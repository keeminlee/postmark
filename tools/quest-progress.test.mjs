// quest-progress.test.mjs — the quest board's progress fold (quest gold Phase 2).
//   node --test tools/quest-progress.test.mjs
//
// Proves the fold REUSES stamp-mint's rule (via deriveMints) rather than
// reimplementing it: dedup, self-mail exclusion, and the per-household daily cap
// all fall out because deriveMints owns them. Plus a live-ledger sanity pass.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { foldQuestProgress, questBoard, loadRegistry, foldLeaderboard, renderSnapshot, boardForHandle } from './quest-progress.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const DAY = '2026-07-20';

// build a throwaway town: a mail-ledger + optional github-id pins (households)
function town(deliveries, pins = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'quest-'));
  mkdirSync(join(dir, 'WHITE_PAGES'), { recursive: true });
  mkdirSync(join(dir, 'tools'), { recursive: true });
  const lines = deliveries.map(([from, to, day = DAY, i = 0]) =>
    `- ${day} · ${from}-${day}-${to}-${i} · ${from} → ${to}`).join('\n');
  writeFileSync(join(dir, 'WHITE_PAGES', 'mail-ledger.md'), lines + '\n');
  writeFileSync(join(dir, 'tools', 'github-ids.json'), JSON.stringify(pins));
  copyFileSync(join(REPO, 'quest-registry.json'), join(dir, 'quest-registry.json'));
  return dir;
}
const send = (repo, h) => foldQuestProgress(repo, { today: DAY }).get(h)?.send ?? 0;

test('progress = distinct valid recipients today (the send face)', () => {
  const d = town([['alice', 'bob'], ['alice', 'carol'], ['alice', 'dave']]);
  try { assert.equal(send(d, 'alice'), 3); } finally { rmSync(d, { recursive: true, force: true }); }
});

test('dedup: same correspondent twice in a day counts once', () => {
  const d = town([['alice', 'bob', DAY, 1], ['alice', 'bob', DAY, 2]]);
  try { assert.equal(send(d, 'alice'), 1); } finally { rmSync(d, { recursive: true, force: true }); }
});

test('self-mail mints nothing', () => {
  const d = town([['alice', 'alice']]);
  try { assert.equal(send(d, 'alice'), 0); } finally { rmSync(d, { recursive: true, force: true }); }
});

test('the per-household daily cap is enforced (reused from deriveMints)', () => {
  // alice + bob share a household (gh:1); together they reach for 6 distinct
  // recipients today — the household send cap (5) lets only 5 mint.
  const d = town(
    [['alice', 'r1'], ['alice', 'r2'], ['alice', 'r3'], ['bob', 'r4'], ['bob', 'r5'], ['bob', 'r6']],
    { alice: { id: '1' }, bob: { id: '1' } },
  );
  try {
    const prog = foldQuestProgress(d, { today: DAY });
    const a = prog.get('alice'), b = prog.get('bob');
    assert.equal(a.send + b.send, 5, 'household send capped at 5');
    assert.equal(a.household.size, 2);
    assert.equal(a.household.send, 5);
    // questBoard surfaces the shared ceiling (size>1 && total>=target)
    const board = questBoard(d, 'alice', { today: DAY });
    const sendQ = board.quests.find((q) => q.id === 'correspond-send');
    assert.equal(sendQ.household.cap_shared, true);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('questBoard: complete flag + registry join', () => {
  const d = town([['alice', 'r1'], ['alice', 'r2'], ['alice', 'r3'], ['alice', 'r4'], ['alice', 'r5']]);
  try {
    const board = questBoard(d, 'alice', { today: DAY });
    const q = board.quests.find((x) => x.id === 'correspond-send');
    assert.equal(q.progress, 5);
    assert.equal(q.complete, true);
    assert.equal(q.title, 'Reach out');
    assert.equal(q.target, 5);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('a resident with no activity today reads a clean zero', () => {
  const d = town([['alice', 'bob']]);
  try {
    const board = questBoard(d, 'nobody', { today: DAY });
    for (const q of board.quests) { assert.equal(q.progress, 0); assert.equal(q.complete, false); }
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('leaderboard: today rows sorted (completions, then progress, then handle), all-time tallied', () => {
  const PRIOR = '2026-07-19';
  const d = town([
    // alice completes Reach out today (5 distinct) AND completed it the prior day → all-time 2
    ['alice', 'r1'], ['alice', 'r2'], ['alice', 'r3'], ['alice', 'r4'], ['alice', 'r5'],
    ['alice', 'r1', PRIOR], ['alice', 'r2', PRIOR], ['alice', 'r3', PRIOR], ['alice', 'r4', PRIOR], ['alice', 'r5', PRIOR],
    // bob: 3 today (no completion)
    ['bob', 'x1'], ['bob', 'x2'], ['bob', 'x3'],
    // carol: no activity today (prior only) → must NOT appear (nonzero-today only)
    ['carol', 'y1', PRIOR],
  ]);
  try {
    const lb = foldLeaderboard(d, { today: DAY });
    const handles = lb.rows.map((r) => r.handle);
    // recipients (r*, x*) legitimately appear — they were REACHED today. The
    // ranking is what matters: alice (1 completion) first, bob (progress 3) next,
    // then the progress-1 recipients; carol (no activity today) absent.
    assert.equal(lb.rows[0].handle, 'alice');
    assert.equal(lb.rows[0].completionsToday, 1);
    assert.equal(lb.rows[0].allTime, 2, 'alice completed Reach out on two days');
    assert.equal(lb.rows[1].handle, 'bob', 'progress 3 ranks above the progress-1 recipients');
    assert.ok(!handles.includes('carol'), 'carol had no progress today');
    assert.equal(lb.totalCompletionsToday, 1);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('snapshot is deterministic (identical state → identical bytes)', () => {
  const d = town([['alice', 'r1'], ['alice', 'r2'], ['bob', 'r3']]);
  try {
    assert.equal(renderSnapshot(d, { today: DAY }), renderSnapshot(d, { today: DAY }));
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('live ledger: every handle within [0, target], flags consistent', () => {
  const reg = loadRegistry(REPO);
  const prog = foldQuestProgress(REPO); // real today
  for (const [handle, p] of prog) {
    for (const [field, val] of [['send', p.send], ['receive', p.receive]]) {
      assert.ok(val >= 0, `${handle}.${field} negative`);
      assert.ok(val <= 5, `${handle}.${field} exceeds cap: ${val}`);
    }
    const board = questBoard(REPO, handle, { progress: prog });
    for (const q of board.quests) assert.equal(q.complete, q.progress >= q.target);
    // decision 7: the milestone quest never renders as a personal quest card
    assert.ok(board.quests.every((q) => q.cadence !== 'milestone'), `${handle} board shows a milestone card`);
    assert.equal(board.quests.length, 2, 'resident cards are the two dailies only');
  }
  // registry now carries the two dailies + the correspond-depth milestone
  assert.equal(reg.quests.length, 3);
  assert.ok(reg.quests.some((q) => q.id === 'correspond-depth' && q.cadence === 'milestone'));
});

// ── `counted`: who already filled a unit today (the quest-card affordance) ────
// The card shows these so a resident can see who already counted and who would
// be a new one. Two invariants matter more than the names themselves: the list
// must be exactly as long as the progress number (or the card contradicts its
// own bar), and it must never repeat a correspondent (dedup is deriveMints').

test('counted lists the correspondents behind the bar, per direction', () => {
  const d = town([['alice', 'bob'], ['alice', 'carol'], ['dave', 'alice']]);
  try {
    const b = questBoard(d, 'alice', { today: DAY });
    const q = (id) => b.quests.find((x) => x.id === id);
    assert.deepEqual(q('correspond-send').counted, ['bob', 'carol']);
    assert.deepEqual(q('correspond-receive').counted, ['dave']);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('counted never repeats a correspondent, and matches progress exactly', () => {
  // bob written to three times, carol once — the bar says 2, so the list must too
  const d = town([['alice', 'bob', DAY, 1], ['alice', 'bob', DAY, 2],
                  ['alice', 'bob', DAY, 3], ['alice', 'carol', DAY, 4]]);
  try {
    const q = questBoard(d, 'alice', { today: DAY }).quests.find((x) => x.id === 'correspond-send');
    assert.equal(q.progress, 2);
    assert.equal(q.counted.length, q.progress, 'counted.length must equal progress');
    assert.equal(new Set(q.counted).size, q.counted.length, 'counted must not repeat');
    assert.deepEqual(q.counted, ['bob', 'carol']);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('counted is [] for a resident with no activity, never undefined', () => {
  const d = town([['bob', 'carol']]);
  try {
    for (const q of questBoard(d, 'alice', { today: DAY }).quests) {
      assert.deepEqual(q.counted, [], `${q.id} should be an empty array`);
    }
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('counted survives a hydrated snapshot that predates the field', () => {
  // the office joins boardForHandle against its own snapshot; an older one has
  // no sentTo/heardFrom. It must read empty, not crash.
  const reg = loadRegistry(REPO);
  const legacy = { send: 2, receive: 0, household: { key: 'solo:alice', size: 1, send: 2, receive: 0 } };
  const b = boardForHandle(reg, legacy, 'alice', DAY);
  const q = b.quests.find((x) => x.id === 'correspond-send');
  assert.equal(q.progress, 2);
  assert.deepEqual(q.counted, []);
});
