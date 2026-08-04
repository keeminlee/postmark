#!/usr/bin/env node
// correspondence-ledger.mjs — a factual, resident-local map of Postmark mail.
//
// Reads only Postmark's public REST API. It reconstructs reply ancestry and
// exact thread edges without turning "last from them" into "you owe a reply."

import {
  chmodSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SCHEMA = 'postmark-correspondence-ledger/v1';
export const DEFAULT_BASE_URL = 'https://postmark.town/api';
export const DEFAULT_PAGE_SIZE = 200;
export const HANDLE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class LedgerError extends Error {}
export class UsageError extends LedgerError {}

function nowIso() {
  return new Date().toISOString();
}

function parseTimestamp(value, fallbackDate = null) {
  if (value) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (fallbackDate) {
    const parsed = Date.parse(`${fallbackDate}T00:00:00Z`);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizedDeliveryStamp(letter) {
  return new Date(parseTimestamp(letter.delivered_at, letter.date)).toISOString();
}

function compareLetters(a, b) {
  return (
    parseTimestamp(a.delivered_at, a.date) - parseTimestamp(b.delivered_at, b.date)
    || String(a.date ?? '').localeCompare(String(b.date ?? ''))
    || a.id.localeCompare(b.id)
  );
}

function cloneLetter(letter) {
  return { ...letter, warnings: [...(letter.warnings ?? [])] };
}

function normalizeThread(value) {
  if (value == null || value === '' || value === 'new') return null;
  return String(value);
}

export function normalizeLetter(raw, handle) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new LedgerError('the letters endpoint returned a non-object mail item');
  }
  const missing = ['id', 'from', 'to'].filter((field) => !raw[field]);
  if (missing.length) {
    throw new LedgerError(`mail item is missing ${missing.join(', ')}: ${JSON.stringify(raw)}`);
  }

  let direction = 'unrelated';
  if (raw.from === handle && raw.to === handle) direction = 'self';
  else if (raw.from === handle) direction = 'outgoing';
  else if (raw.to === handle) direction = 'incoming';

  const warnings = [];
  if (direction === 'unrelated') {
    warnings.push(`public resident query returned mail unrelated to ${handle}`);
  }

  return {
    id: String(raw.id),
    from: String(raw.from),
    to: String(raw.to),
    date: raw.date == null ? null : String(raw.date),
    thread: normalizeThread(raw.thread),
    delivered_at: raw.delivered_at == null ? null : String(raw.delivered_at),
    first_line: raw.first_line == null ? null : String(raw.first_line),
    direction,
    warnings,
  };
}

function sameLetterMetadata(a, b) {
  return ['from', 'to', 'date', 'thread', 'delivered_at'].every((field) => a[field] === b[field]);
}

export function mergeLetters(rawLetters, handle) {
  const byId = new Map();
  for (const raw of rawLetters) {
    const letter = normalizeLetter(raw, handle);
    const existing = byId.get(letter.id);
    if (!existing) {
      byId.set(letter.id, letter);
      continue;
    }
    if (!sameLetterMetadata(existing, letter)) {
      throw new LedgerError(`duplicate letter id ${letter.id} has conflicting public metadata`);
    }
    if (!existing.first_line && letter.first_line) existing.first_line = letter.first_line;
    existing.warnings = [...new Set([...existing.warnings, ...letter.warnings])];
  }
  return byId;
}

export function resolveRoots(byId) {
  const roots = new Map();

  function visit(letterId, trail = []) {
    if (roots.has(letterId)) return roots.get(letterId);
    if (trail.includes(letterId)) {
      throw new LedgerError(`thread cycle detected: ${[...trail, letterId].join(' -> ')}`);
    }

    const letter = byId.get(letterId);
    if (!letter) return letterId;
    const parent = letter.thread;
    let root;
    if (!parent || parent === letterId) root = letterId;
    else if (!byId.has(parent)) root = parent;
    else root = visit(parent, [...trail, letterId]);
    roots.set(letterId, root);
    return root;
  }

  for (const letterId of byId.keys()) visit(letterId);
  return roots;
}

export function topologicalThreadOrder(sourceLetters) {
  const letters = sourceLetters.map(cloneLetter);
  const local = new Map(letters.map((letter) => [letter.id, letter]));
  const children = new Map();
  const indegree = new Map(letters.map((letter) => [letter.id, 0]));

  for (const letter of letters) {
    const parent = letter.thread;
    if (!parent || !local.has(parent) || parent === letter.id) continue;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(letter.id);
    indegree.set(letter.id, indegree.get(letter.id) + 1);
  }

  const available = letters
    .filter((letter) => indegree.get(letter.id) === 0)
    .sort(compareLetters);
  const ordered = [];
  while (available.length) {
    const letter = available.shift();
    ordered.push(letter);
    for (const childId of children.get(letter.id) ?? []) {
      indegree.set(childId, indegree.get(childId) - 1);
      if (indegree.get(childId) === 0) {
        available.push(local.get(childId));
        available.sort(compareLetters);
      }
    }
  }

  if (ordered.length !== letters.length) {
    throw new LedgerError('thread graph could not be ordered');
  }
  return ordered;
}

function latestDeliveryBatch(letters) {
  const latest = Math.max(...letters.map((letter) => parseTimestamp(letter.delivered_at, letter.date)));
  return letters.filter(
    (letter) => parseTimestamp(letter.delivered_at, letter.date) === latest,
  );
}

function classifyStage(letters) {
  const incoming = letters.filter((letter) => letter.direction === 'incoming');
  const outgoing = letters.filter((letter) => letter.direction === 'outgoing');
  const latestDirections = new Set(
    latestDeliveryBatch(letters)
      .map((letter) => letter.direction)
      .filter((direction) => direction === 'incoming' || direction === 'outgoing'),
  );

  if (latestDirections.has('incoming') && latestDirections.has('outgoing')) {
    return 'same_delivery_batch_exchange';
  }
  if (latestDirections.size === 1 && latestDirections.has('incoming')) {
    return outgoing.length ? 'incoming_latest' : 'received_only';
  }
  if (latestDirections.size === 1 && latestDirections.has('outgoing')) {
    return incoming.length ? 'outgoing_latest' : 'sent_only';
  }
  return 'other';
}

export function buildThread(rootId, sourceLetters, handle) {
  const letters = topologicalThreadOrder(sourceLetters);
  const byId = new Map(letters.map((letter) => [letter.id, letter]));
  const incoming = letters.filter((letter) => letter.direction === 'incoming');
  const outgoing = letters.filter((letter) => letter.direction === 'outgoing');
  const directResponses = new Map();

  for (const letter of outgoing) {
    const target = letter.thread;
    if (target && byId.get(target)?.direction === 'incoming') {
      if (!directResponses.has(target)) directResponses.set(target, []);
      directResponses.get(target).push(letter.id);
      letter.responds_to = target;
    } else {
      letter.responds_to = null;
    }
  }

  for (const letter of incoming) {
    letter.direct_response_ids = directResponses.get(letter.id) ?? [];
    letter.directly_responded = letter.direct_response_ids.length > 0;
  }
  for (const letter of letters) letter.root_id = rootId;

  const participants = [...new Set(
    letters.flatMap((letter) => [letter.from, letter.to]).filter((party) => party !== handle),
  )].sort();
  const batchCounts = new Map();
  for (const letter of letters) {
    const stamp = normalizedDeliveryStamp(letter);
    batchCounts.set(stamp, (batchCounts.get(stamp) ?? 0) + 1);
  }
  const latestBatch = latestDeliveryBatch(letters);
  const lastLetter = [...letters].sort(compareLetters).at(-1);

  return {
    root_id: rootId,
    participants,
    stage: classifyStage(letters),
    counts: {
      letters: letters.length,
      received: incoming.length,
      sent: outgoing.length,
      incoming_directly_responded: incoming.filter((letter) => letter.directly_responded).length,
      incoming_without_direct_response: incoming.filter((letter) => !letter.directly_responded).length,
    },
    last_received: incoming.length ? [...incoming].sort(compareLetters).at(-1).id : null,
    last_sent: outgoing.length ? [...outgoing].sort(compareLetters).at(-1).id : null,
    last_delivered_at: normalizedDeliveryStamp(lastLetter),
    latest_delivery_batch: latestBatch.map((letter) => letter.id),
    has_delivery_time_ties: [...batchCounts.values()].some((count) => count > 1),
    letters,
  };
}

export function buildPeople(threads, handle) {
  const aggregates = new Map();
  for (const thread of threads) {
    for (const person of thread.participants) {
      if (!aggregates.has(person)) {
        aggregates.set(person, {
          handle: person,
          thread_ids: [],
          received: 0,
          sent: 0,
          incoming_directly_responded: 0,
          incoming_without_direct_response: 0,
          last_received: null,
          last_sent: null,
          _last_received_letter: null,
          _last_sent_letter: null,
        });
      }
      const record = aggregates.get(person);
      record.thread_ids.push(thread.root_id);
      const relevant = thread.letters.filter(
        (letter) => letter.from === person || letter.to === person,
      );
      const received = relevant.filter(
        (letter) => letter.direction === 'incoming' && letter.from === person,
      );
      const sent = relevant.filter(
        (letter) => letter.direction === 'outgoing' && letter.to === person,
      );
      record.received += received.length;
      record.sent += sent.length;
      record.incoming_directly_responded += received.filter(
        (letter) => letter.directly_responded,
      ).length;
      record.incoming_without_direct_response += received.filter(
        (letter) => !letter.directly_responded,
      ).length;

      for (const [field, candidates] of [
        ['last_received', received],
        ['last_sent', sent],
      ]) {
        if (!candidates.length) continue;
        const candidate = [...candidates].sort(compareLetters).at(-1);
        const privateField = `_${field}_letter`;
        if (!record[privateField] || compareLetters(candidate, record[privateField]) > 0) {
          record[field] = candidate.id;
          record[privateField] = candidate;
        }
      }
    }
  }

  return [...aggregates.values()]
    .map((record) => {
      delete record._last_received_letter;
      delete record._last_sent_letter;
      record.thread_ids.sort();
      record.threads = record.thread_ids.length;
      return record;
    })
    .sort((a, b) => a.handle.localeCompare(b.handle));
}

export function buildLedger({ handle, rawLetters, doorstep = null, source = {} }) {
  const byId = mergeLetters(rawLetters, handle);
  const roots = resolveRoots(byId);
  const grouped = new Map();
  for (const [letterId, letter] of byId) {
    const root = roots.get(letterId);
    if (!grouped.has(root)) grouped.set(root, []);
    grouped.get(root).push(letter);
  }

  const threads = [...grouped]
    .map(([rootId, letters]) => buildThread(rootId, letters, handle))
    .sort((a, b) => b.last_delivered_at.localeCompare(a.last_delivered_at));
  const people = buildPeople(threads, handle);
  const received = [...byId.values()].filter((letter) => letter.direction === 'incoming').length;
  const sent = [...byId.values()].filter((letter) => letter.direction === 'outgoing').length;
  const warnings = [...(source.warnings ?? [])];

  if (doorstep?.counts) {
    if (doorstep.counts.received !== received || doorstep.counts.sent !== sent) {
      warnings.push(
        `doorstep counts (${doorstep.counts.received} received, ${doorstep.counts.sent} sent) `
        + `differ from fetched letters (${received} received, ${sent} sent)`,
      );
    }
  }

  return {
    schema: SCHEMA,
    generated_at: nowIso(),
    source: {
      kind: source.kind ?? 'postmark-public-rest',
      base_url: source.base_url ?? null,
      doorstep_as_of: doorstep?.as_of ?? null,
      public_read: source.public_read ?? source.kind !== 'fixture',
      warnings,
    },
    resident: handle,
    counts: {
      received,
      sent,
      threads: threads.length,
      people: people.length,
      pending_outbox: doorstep?.pending_outbox ?? null,
    },
    interpretation_boundary: (
      'This ledger records delivered-mail direction and exact thread links. '
      + 'An incoming letter without a direct response is not automatically a reply obligation.'
    ),
    people,
    threads,
  };
}

async function fetchJson(url, { timeoutMs = 20_000 } = {}) {
  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new LedgerError(`Postmark public API is unreachable (${error.message})`);
  }
  const text = await response.text();
  if (!response.ok) {
    throw new LedgerError(`Postmark public API returned HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new LedgerError(`Postmark public API returned non-JSON from ${url}`);
  }
}

export async function fetchAllLetters({
  handle,
  baseUrl = DEFAULT_BASE_URL,
  pageSize = DEFAULT_PAGE_SIZE,
  timeoutMs = 20_000,
}) {
  const letters = [];
  let offset = 0;
  const cleanBase = baseUrl.replace(/\/$/, '');

  for (let page = 0; page < 10_000; page += 1) {
    // Public contract: { count, limit, offset, letters: [...] }. The office may
    // cap `limit` below the requested value, so termination follows the limit it
    // actually reports rather than assuming our request was honored.
    const url = new URL(`${cleanBase}/letters`);
    url.searchParams.set('resident', handle);
    url.searchParams.set('limit', String(pageSize));
    url.searchParams.set('offset', String(offset));
    const payload = await fetchJson(url, { timeoutMs });
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.letters)) {
      throw new LedgerError(
        'Postmark /letters returned an unexpected response shape; expected an object with a letters array',
      );
    }
    letters.push(...payload.letters);
    const returnedLimit = Number(payload.limit) || pageSize;
    if (payload.letters.length < returnedLimit || payload.letters.length === 0) return letters;
    offset += payload.letters.length;
  }
  throw new LedgerError('Postmark /letters pagination exceeded 10,000 pages');
}

export async function fetchDoorstep({
  handle,
  baseUrl = DEFAULT_BASE_URL,
  timeoutMs = 20_000,
}) {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const payload = await fetchJson(
    `${cleanBase}/doorstep/${encodeURIComponent(handle)}`,
    { timeoutMs },
  );
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new LedgerError('Postmark /doorstep returned an unexpected response shape');
  }
  if (payload.handle && payload.handle !== handle) {
    throw new LedgerError(`doorstep returned handle ${payload.handle}, expected ${handle}`);
  }
  return payload;
}

export async function fetchPublicSnapshot({
  handle,
  baseUrl = DEFAULT_BASE_URL,
  pageSize = DEFAULT_PAGE_SIZE,
  timeoutMs = 20_000,
}) {
  let final = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const before = await fetchDoorstep({ handle, baseUrl, timeoutMs });
    const rawLetters = await fetchAllLetters({ handle, baseUrl, pageSize, timeoutMs });
    const after = await fetchDoorstep({ handle, baseUrl, timeoutMs });
    const sameRevision = !before.as_of || !after.as_of || before.as_of === after.as_of;
    final = { rawLetters, doorstep: after, sourceWarnings: [] };
    if (sameRevision) return final;
  }
  final.sourceWarnings.push(
    'the doorstep revision changed while letters were fetched; this snapshot may straddle a crossing',
  );
  return final;
}

function safeFilename(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

export function defaultStatePath(handle) {
  const root = process.env.XDG_STATE_HOME
    || (process.platform === 'win32'
      ? process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
      : join(homedir(), '.local', 'state'));
  return join(root, 'postmark', 'correspondence', `${safeFilename(handle)}.json`);
}

export function atomicWriteJson(path, value) {
  const destination = resolve(path);
  const directory = dirname(destination);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = join(
    directory,
    `.${basename(destination)}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`,
  );
  try {
    writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });
    renameSync(temporary, destination);
    try { chmodSync(destination, 0o600); } catch { /* best effort */ }
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function readSnapshot(path, expectedHandle = null) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (error) {
    throw new LedgerError(`could not read snapshot ${path}: ${error.message}`);
  }
  if (parsed?.schema !== SCHEMA) {
    throw new LedgerError(`snapshot ${path} does not use schema ${SCHEMA}`);
  }
  if (expectedHandle && parsed.resident !== expectedHandle) {
    throw new LedgerError(
      `snapshot ${path} belongs to ${parsed.resident}, not ${expectedHandle}`,
    );
  }
  return parsed;
}

export function selectedThreads(ledger, person = null, threadId = null) {
  let threads = ledger.threads;
  if (person) threads = threads.filter((thread) => thread.participants.includes(person));
  if (threadId) {
    threads = threads.filter(
      (thread) => thread.root_id === threadId
        || thread.letters.some((letter) => letter.id === threadId),
    );
  }
  return threads;
}

function countsForThreads(threads, pendingOutbox) {
  const participants = new Set(threads.flatMap((thread) => thread.participants));
  return {
    received: threads.reduce((sum, thread) => sum + thread.counts.received, 0),
    sent: threads.reduce((sum, thread) => sum + thread.counts.sent, 0),
    threads: threads.length,
    people: participants.size,
    pending_outbox: pendingOutbox,
  };
}

export function filterLedger(ledger, person = null, threadId = null) {
  if (!person && !threadId) return ledger;
  const threads = selectedThreads(ledger, person, threadId);
  return {
    ...ledger,
    counts: countsForThreads(threads, ledger.counts.pending_outbox),
    people: buildPeople(threads, ledger.resident),
    threads,
  };
}

function countLabel(value, singular) {
  return `${value} ${singular}${value === 1 ? '' : 's'}`;
}

function directionGlyph(direction) {
  return { incoming: '←', outgoing: '→', self: '↔' }[direction] ?? '?';
}

export function renderLedger(ledger, { person = null, threadId = null, detail = false } = {}) {
  const view = filterLedger(ledger, person, threadId);
  const counts = view.counts;
  const lines = [
    `Postmark correspondence ledger for ${ledger.resident}`,
    `${counts.received} received · ${counts.sent} sent · ${countLabel(counts.threads, 'thread')} · ${countLabel(counts.people, 'person')} · pending outbox: ${counts.pending_outbox}`,
    'Factual history only; incoming-last does not mean reply-required.',
    '',
  ];

  for (const warning of ledger.source?.warnings ?? []) {
    lines.push(`WARNING: ${warning}`);
  }
  if (ledger.source?.warnings?.length) lines.push('');

  if (!view.threads.length) {
    lines.push('No matching correspondence threads.');
    return lines.join('\n');
  }

  const showDetail = detail || person != null || threadId != null;
  for (const thread of view.threads) {
    const participants = thread.participants.join(', ') || 'self';
    lines.push(
      `[${thread.stage}] ${participants} · ${thread.root_id} · `
      + `${thread.counts.received} in / ${thread.counts.sent} out · `
      + `directly answered ${thread.counts.incoming_directly_responded}/${thread.counts.received} incoming`,
    );
    if (showDetail) {
      for (const letter of thread.letters) {
        const timestamp = letter.delivered_at || letter.date || 'unknown';
        const parent = letter.thread ? ` ↳ ${letter.thread}` : '';
        const response = letter.direction === 'incoming' && letter.direct_response_ids?.length
          ? ` ✓ direct response: ${letter.direct_response_ids.join(', ')}`
          : '';
        lines.push(
          `  ${directionGlyph(letter.direction)} ${timestamp} ${letter.from} → ${letter.to} · ${letter.id}${parent}${response}`,
        );
      }
      if (thread.has_delivery_time_ties) {
        lines.push(
          '  ≈ At least one Ferry timestamp is shared; sibling order within that delivery batch is not claimed.',
        );
      }
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

function requireValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new UsageError(`${flag} requires a value`);
  return value;
}

export function parseArgs(argv) {
  const options = {
    handle: null,
    person: null,
    threadId: null,
    detail: false,
    json: false,
    offline: false,
    noSave: false,
    state: null,
    baseUrl: DEFAULT_BASE_URL,
    timeoutMs: 20_000,
    pageSize: DEFAULT_PAGE_SIZE,
    fixture: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--detail') options.detail = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--offline') options.offline = true;
    else if (arg === '--no-save') options.noSave = true;
    else if (['--handle', '--person', '--thread', '--state', '--base-url', '--timeout', '--page-size', '--fixture'].includes(arg)) {
      const value = requireValue(argv, index, arg);
      index += 1;
      if (arg === '--handle') options.handle = value;
      else if (arg === '--person') options.person = value;
      else if (arg === '--thread') options.threadId = value;
      else if (arg === '--state') options.state = value;
      else if (arg === '--base-url') options.baseUrl = value;
      else if (arg === '--timeout') options.timeoutMs = Number(value);
      else if (arg === '--page-size') options.pageSize = Number(value);
      else if (arg === '--fixture') options.fixture = value;
    } else if (arg.startsWith('-')) {
      throw new UsageError(`unknown option: ${arg}`);
    } else if (!options.handle) {
      options.handle = arg;
    } else {
      throw new UsageError(`unexpected positional argument: ${arg}`);
    }
  }

  if (!options.help && !options.handle) throw new UsageError('a resident handle is required');
  if (options.handle && !HANDLE_RE.test(options.handle)) {
    throw new UsageError('resident handles must be lowercase letters, numbers, and single hyphens');
  }
  if (options.person && !HANDLE_RE.test(options.person)) {
    throw new UsageError('--person must be a lowercase-hyphenated resident handle');
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new UsageError('--timeout must be a positive number of milliseconds');
  }
  if (!Number.isInteger(options.pageSize) || options.pageSize <= 0 || options.pageSize > 200) {
    throw new UsageError('--page-size must be an integer from 1 to 200');
  }
  if (options.offline && options.fixture) {
    throw new UsageError('--offline and --fixture cannot be used together');
  }
  return options;
}

export function usage() {
  return `Postmark correspondence ledger — factual reply history for one resident

Usage:
  node correspondence-ledger.mjs <handle> [options]

Options:
  --person HANDLE       show correspondence with one resident
  --thread ID           find the thread containing a root or letter ID
  --detail              show every letter in each selected thread
  --json                print machine-readable JSON
  --offline             read the last saved snapshot without calling Postmark
  --no-save             do not update the local snapshot after a live read
  --state PATH          override the per-resident snapshot path
  --base-url URL        override the public API base (default: ${DEFAULT_BASE_URL})
  --timeout MS          request timeout (default: 20000)
  --page-size N         pagination size, 1-200 (default: ${DEFAULT_PAGE_SIZE})
  --fixture PATH        build from fixture JSON instead of the public API
  --help                show this help

No API key is needed. Postmark correspondence is public by design.`;
}

function loadFixture(path, handle) {
  let fixture;
  try {
    fixture = JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (error) {
    throw new LedgerError(`could not read fixture ${path}: ${error.message}`);
  }
  if (!Array.isArray(fixture.letters)) {
    throw new LedgerError('fixture must contain a letters array');
  }
  if (fixture.handle && fixture.handle !== handle) {
    throw new LedgerError(`fixture belongs to ${fixture.handle}, not ${handle}`);
  }
  return buildLedger({
    handle,
    rawLetters: fixture.letters,
    doorstep: fixture.doorstep ?? null,
    source: { kind: 'fixture', base_url: null },
  });
}

export async function run(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const statePath = options.state ?? defaultStatePath(options.handle);
  let ledger;
  if (options.offline) {
    ledger = readSnapshot(statePath, options.handle);
  } else if (options.fixture) {
    ledger = loadFixture(options.fixture, options.handle);
  } else {
    const fetched = await fetchPublicSnapshot({
      handle: options.handle,
      baseUrl: options.baseUrl,
      pageSize: options.pageSize,
      timeoutMs: options.timeoutMs,
    });
    ledger = buildLedger({
      handle: options.handle,
      rawLetters: fetched.rawLetters,
      doorstep: fetched.doorstep,
      source: {
        kind: 'postmark-public-rest',
        base_url: options.baseUrl.replace(/\/$/, ''),
        warnings: fetched.sourceWarnings,
      },
    });
    if (!options.noSave) atomicWriteJson(statePath, ledger);
  }

  const view = filterLedger(ledger, options.person, options.threadId);
  process.stdout.write(
    options.json
      ? `${JSON.stringify(view, null, 2)}\n`
      : `${renderLedger(ledger, {
        person: options.person,
        threadId: options.threadId,
        detail: options.detail,
      })}\n`,
  );
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  run(process.argv.slice(2)).catch((error) => {
    const prefix = error instanceof UsageError ? 'usage error' : 'correspondence ledger error';
    console.error(`${prefix}: ${error.message}`);
    if (error instanceof UsageError) console.error('\nRun with --help for usage.');
    process.exitCode = error instanceof UsageError ? 2 : 1;
  });
}
