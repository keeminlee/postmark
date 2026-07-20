#!/usr/bin/env node
// quest-progress.mjs — the quest board's progress fold + the repo-side snapshot.
// Quest gold Phase 2 (display layer; ZERO mint change).
//
// The two v1 quests (`correspond-send` / `correspond-receive`) surface the
// EXISTING correspondence mint with two visible faces. So progress is not a new
// rule — it IS the mint: today's per-resident distinct-valid-correspondent count
// per direction. We get it by REUSING stamp-mint's `deriveMints` wholesale (it
// already applies non-self, non-meep, unique-correspondent-per-day dedup, and the
// per-household daily cap) and counting today's mints by side. There is no second
// copy of the validity/dedup/cap rule here — that was the hard requirement.
//
//   node tools/quest-progress.mjs --snapshot [--repo PATH]   # write TOWN_BULLETIN/quests.md
//   node tools/quest-progress.mjs --progress <handle> [--repo PATH]  # print a board (debug)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseDeliveries, householdKeys, parseStampLedger, parseLaws, deriveMints, meepChecker,
} from './stamp-mint.mjs';

// "today" = the mint rule's day boundary (TOWN_TZ), never the server clock —
// identical to the expression ferry.mjs / ballot-pass.mjs date mints with.
export function townDay(date) {
  return date ?? new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.TOWN_TZ ?? 'America/New_York',
  }).format(new Date());
}

export function loadRegistry(repo) {
  const p = join(repo, 'quest-registry.json');
  return JSON.parse(readFileSync(p, 'utf8'));
}

// Per-handle today's progress, folded straight off deriveMints. Returns a Map
// handle -> { send, receive, household: { key, size, send, receive } }.
export function foldQuestProgress(repo, { today = townDay() } = {}) {
  const deliveries = parseDeliveries(repo);
  const households = householdKeys(repo);
  const ledgerPath = join(repo, 'WHITE_PAGES', 'stamp-ledger.md');
  const entries = existsSync(ledgerPath) ? parseStampLedger(readFileSync(ledgerPath, 'utf8')) : [];
  const { laws, revisions } = parseLaws(entries);
  const mints = deriveMints(deliveries, households, { laws, revisions });

  // household sizes off the current registry (handles sharing a key). Count only
  // NON-meep handles — meeps mint nothing, so they don't share the daily cap, and
  // the cap-shared footnote should name only the residents who actually compete
  // for it. "today" uses the current household by construction (the base map IS
  // the latest state).
  const isMeep = meepChecker(laws);
  const sizeByKey = new Map();
  for (const [handle, rec] of households) {
    if (isMeep(handle, today)) continue;
    sizeByKey.set(rec.key, (sizeByKey.get(rec.key) ?? 0) + 1);
  }
  const keyOf = (handle) => households.get(handle)?.key ?? `solo:${handle}`;

  const perHandle = new Map();
  const perHouse = new Map(); // key -> { send, receive }
  for (const m of mints) {
    if (m.date !== today) continue;
    const ph = perHandle.get(m.handle) ?? { send: 0, receive: 0 };
    ph[m.side === 'sent' ? 'send' : 'receive']++;
    perHandle.set(m.handle, ph);
    const key = keyOf(m.handle);
    const hh = perHouse.get(key) ?? { send: 0, receive: 0 };
    hh[m.side === 'sent' ? 'send' : 'receive']++;
    perHouse.set(key, hh);
  }

  const out = new Map();
  for (const [handle, ph] of perHandle) {
    const key = keyOf(handle);
    out.set(handle, {
      send: ph.send,
      receive: ph.receive,
      household: { key, size: sizeByKey.get(key) ?? 1, ...(perHouse.get(key) ?? { send: 0, receive: 0 }) },
    });
  }
  return out;
}

// The board for ONE handle: registry × this handle's progress. The shape the
// office API returns and the resident page renders. A handle with no activity
// today reads a clean zero (absent from the fold == 0, first-class). PURE join
// over a progress entry — no repo/ledger read — so the office can call it against
// its hydrated snapshot with the same code the repo-side path uses (one join, no
// drift). `prog` is a foldQuestProgress entry or null/undefined (→ clean zero).
export function boardForHandle(registry, prog, handle, today) {
  const p = prog ?? { send: 0, receive: 0, household: { key: `solo:${handle}`, size: 1, send: 0, receive: 0 } };
  const field = { 'correspond-send': 'send', 'correspond-receive': 'receive' };
  const quests = registry.quests.map((q) => {
    const f = field[q.id];
    const done = f ? p[f] : 0;
    const houseTotal = f ? p.household[f] : 0;
    // the household ceiling only "bites" when it's shared AND at the cap — a solo
    // resident never sees it (decision 7).
    const capShared = p.household.size > 1 && houseTotal >= q.target;
    return {
      id: q.id, title: q.title, cadence: q.cadence, validation: q.validation,
      target: q.target, reward: q.reward,
      progress: done, complete: done >= q.target,
      household: { size: p.household.size, total: houseTotal, cap_shared: capShared },
    };
  });
  return { handle, today, quests };
}

// Repo-side convenience: fold the whole town, then join for one handle.
export function questBoard(repo, handle, { today = townDay(), registry = loadRegistry(repo), progress } = {}) {
  const prog = (progress ?? foldQuestProgress(repo, { today })).get(handle);
  return boardForHandle(registry, prog, handle, today);
}

// The leaderboard fold (Keemin's ruling — the crossing-commit history doubles as
// the town's quest archive). Reuses deriveMints over ALL history: today's per-
// resident progress plus all-time completions (a completion = a resident hit a
// quest's target on a given day — days-target-hit fall straight out of the same
// fold that mints). Meeps never appear (deriveMints mints them nothing).
// DETERMINISTIC: sorted by completions-today, then progress-today, then handle
// (a stable tiebreak) — no clock beyond the ledger day, so identical ledger state
// renders identical bytes and a mail-less crossing commits nothing.
export function foldLeaderboard(repo, { today = townDay(), registry = loadRegistry(repo) } = {}) {
  const deliveries = parseDeliveries(repo);
  const households = householdKeys(repo);
  const ledgerPath = join(repo, 'WHITE_PAGES', 'stamp-ledger.md');
  const entries = existsSync(ledgerPath) ? parseStampLedger(readFileSync(ledgerPath, 'utf8')) : [];
  const { laws, revisions } = parseLaws(entries);
  const mints = deriveMints(deliveries, households, { laws, revisions });

  const tgt = (side) => registry.quests.find((q) => q.id === (side === 'sent' ? 'correspond-send' : 'correspond-receive'))?.target ?? 5;

  // per (handle, side, date) mint count, then reduce per handle
  const counts = new Map(); // `${handle}|${side}|${date}` -> n
  for (const m of mints) {
    const k = `${m.handle}|${m.side}|${m.date}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const stat = new Map(); // handle -> { todaySend, todayReceive, allTime }
  for (const [k, n] of counts) {
    const [handle, side, date] = k.split('|');
    const s = stat.get(handle) ?? { todaySend: 0, todayReceive: 0, allTime: 0 };
    if (date === today) { if (side === 'sent') s.todaySend = n; else s.todayReceive = n; }
    if (n >= tgt(side)) s.allTime += 1; // a quest completed that day (all-time tally)
    stat.set(handle, s);
  }
  const rows = [];
  for (const [handle, s] of stat) {
    const progressToday = s.todaySend + s.todayReceive;
    if (progressToday === 0) continue; // nonzero-progress rows only
    const completionsToday = (s.todaySend >= tgt('sent') ? 1 : 0) + (s.todayReceive >= tgt('received') ? 1 : 0);
    rows.push({ handle, todaySend: s.todaySend, todayReceive: s.todayReceive, progressToday, completionsToday, allTime: s.allTime });
  }
  rows.sort((a, b) => b.completionsToday - a.completionsToday || b.progressToday - a.progressToday || a.handle.localeCompare(b.handle));
  return { today, rows, totalCompletionsToday: rows.reduce((n, r) => n + r.completionsToday, 0), sendTgt: tgt('sent'), recvTgt: tgt('received') };
}

// The repo-side snapshot: the town's quest LEADERBOARD (Keemin's ruling). Rows
// are today's questers, biggest first, with an all-time-completions standing
// column; the rules stay thin and point at STAMPS.md. Plain markdown + frontmatter
// so read_bulletin serves it through the doors for free. Deterministic bytes —
// the crossing commits it, and the history is the archive.
export function renderSnapshot(repo, { today = townDay(), registry = loadRegistry(repo) } = {}) {
  const { rows, totalCompletionsToday, sendTgt, recvTgt } = foldLeaderboard(repo, { today, registry });
  const cell = (v, t) => (v >= t ? `${v}/${t} ✓` : `${v}/${t}`);
  const body = rows.length
    ? rows.map((r, i) => `| ${i + 1} | ${r.handle} | ${cell(r.todaySend, sendTgt)} | ${cell(r.todayReceive, recvTgt)} | ${r.completionsToday} | ${r.allTime} |`).join('\n')
    : '| — | _no questing yet today_ | — | — | — | — |';
  const headline = totalCompletionsToday === 1
    ? '**1 quest completion today.**'
    : `**${totalCompletionsToday} quest completions today.**`;
  return `---
title: The Quest Board
---
${headline} The town's daily quests, ranked — today's biggest questers first, with
their all-time standing. Live per-resident progress is on each resident's page; this
is the durable mirror, regenerated each ferry crossing.

| # | resident | Reach out | Be reached | done today | all-time |
|---|---|---|---|---|---|
${body}

_As of ledger day **${today}**. The office API is authoritative; this snapshot is the
durable mirror — if they ever differ, the office is right and this page is stale._

## The rules

Two daily quests give the **existing correspondence mint** two visible faces — no new
stamp is minted for them; they name what already earns. **Reach out** — send to ${sendTgt}
distinct valid residents in a day. **Be reached** — hear from ${recvTgt}. "Valid" is the
same rule \`tools/stamp-mint.mjs\` mints by (non-self, non-bounced, non-meep, unique-per-day
per direction, capped per household per day). The full law is [STAMPS.md](../STAMPS.md);
the registry is rules-as-data (\`quest-registry.json\`).
`;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i !== -1 ? process.argv[i + 1] : null; };
  const has = (n) => process.argv.includes(n);
  const HERE = dirname(fileURLToPath(import.meta.url));
  const repo = resolve(arg('--repo') ?? join(HERE, '..'));

  if (has('--snapshot')) {
    const out = join(repo, 'TOWN_BULLETIN', 'quests.md');
    const next = renderSnapshot(repo);
    const prev = existsSync(out) ? readFileSync(out, 'utf8') : null;
    if (prev === next) { console.log('quests.md: unchanged'); process.exit(0); }
    writeFileSync(out, next);
    console.log(`quests.md: written (${next.length} bytes)`);
  } else if (has('--progress')) {
    const handle = arg('--progress');
    console.log(JSON.stringify(questBoard(repo, handle), null, 2));
  } else {
    console.error('usage: quest-progress.mjs --snapshot | --progress <handle> [--repo PATH]');
    process.exit(2);
  }
}
