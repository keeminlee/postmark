import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  LedgerError,
  SCHEMA,
  atomicWriteJson,
  buildLedger,
  fetchPublicSnapshot,
  filterLedger,
  parseArgs,
  readSnapshot,
  renderLedger,
} from './correspondence-ledger.mjs';

function letter({
  id,
  from,
  to,
  deliveredAt,
  thread = null,
  date = '2026-08-02',
}) {
  return {
    id,
    from,
    to,
    date,
    thread,
    delivered_at: deliveredAt,
    first_line: `${from} says hello`,
  };
}

function build(letters, pendingOutbox = 0) {
  const received = letters.filter((item) => item.to === 'hal').length;
  const sent = letters.filter((item) => item.from === 'hal').length;
  return buildLedger({
    handle: 'hal',
    rawLetters: letters,
    doorstep: {
      handle: 'hal',
      as_of: 'receipt-1',
      pending_outbox: pendingOutbox,
      counts: { received, sent },
    },
    source: { kind: 'fixture', base_url: null },
  });
}

test('received-only is factual state, not an obligation label', () => {
  const ledger = build([
    letter({
      id: 'maya-root',
      from: 'maya',
      to: 'hal',
      deliveredAt: '2026-08-02T00:00:00Z',
    }),
  ]);
  const thread = ledger.threads[0];
  assert.equal(thread.stage, 'received_only');
  assert.equal(thread.counts.incoming_without_direct_response, 1);
  assert.match(ledger.interpretation_boundary, /not automatically a reply obligation/);
});

test('an exact outgoing thread edge records a direct response', () => {
  const ledger = build([
    letter({
      id: 'maya-root',
      from: 'maya',
      to: 'hal',
      deliveredAt: '2026-08-02T00:00:00Z',
    }),
    letter({
      id: 'hal-reply',
      from: 'hal',
      to: 'maya',
      deliveredAt: '2026-08-02T12:00:00Z',
      thread: 'maya-root',
    }),
  ]);
  const thread = ledger.threads[0];
  assert.equal(thread.stage, 'outgoing_latest');
  assert.deepEqual(thread.letters[0].direct_response_ids, ['hal-reply']);
  assert.equal(thread.letters[1].responds_to, 'maya-root');
});

test('reply then continuation remains one reconstructed thread', () => {
  const ledger = build([
    letter({
      id: 'maya-root',
      from: 'maya',
      to: 'hal',
      deliveredAt: '2026-08-02T00:00:00Z',
    }),
    letter({
      id: 'hal-reply',
      from: 'hal',
      to: 'maya',
      deliveredAt: '2026-08-02T12:00:00Z',
      thread: 'maya-root',
    }),
    letter({
      id: 'maya-continuation',
      from: 'maya',
      to: 'hal',
      deliveredAt: '2026-08-03T00:00:00Z',
      thread: 'maya-root',
    }),
  ]);
  assert.equal(ledger.threads.length, 1);
  const thread = ledger.threads[0];
  assert.equal(thread.stage, 'incoming_latest');
  assert.deepEqual(thread.counts, {
    letters: 3,
    received: 2,
    sent: 1,
    incoming_directly_responded: 1,
    incoming_without_direct_response: 1,
  });
  assert.equal(ledger.people[0].handle, 'maya');
});

test('a parent chain resolves to its original root', () => {
  const ledger = build([
    letter({
      id: 'root',
      from: 'claran',
      to: 'hal',
      deliveredAt: '2026-07-24T00:00:00Z',
    }),
    letter({
      id: 'hal-reply-one',
      from: 'hal',
      to: 'claran',
      deliveredAt: '2026-07-24T12:00:00Z',
      thread: 'root',
    }),
    letter({
      id: 'incoming-two',
      from: 'claran',
      to: 'hal',
      deliveredAt: '2026-07-25T00:00:00Z',
      thread: 'hal-reply-one',
    }),
    letter({
      id: 'hal-reply-two',
      from: 'hal',
      to: 'claran',
      deliveredAt: '2026-07-25T12:00:00Z',
      thread: 'incoming-two',
    }),
  ]);
  assert.equal(ledger.threads.length, 1);
  assert.equal(ledger.threads[0].root_id, 'root');
  assert.equal(ledger.threads[0].counts.incoming_directly_responded, 2);
});

test('same Ferry instant is detected across equivalent ISO spellings', () => {
  const ledger = build([
    letter({
      id: 'maya-root',
      from: 'maya',
      to: 'hal',
      deliveredAt: '2026-08-02T00:00:37Z',
    }),
    letter({
      id: 'hal-reply',
      from: 'hal',
      to: 'maya',
      deliveredAt: '2026-08-03T00:00:37.000Z',
      thread: 'maya-root',
    }),
    letter({
      id: 'maya-continuation',
      from: 'maya',
      to: 'hal',
      deliveredAt: '2026-08-03T00:00:37+00:00',
      thread: 'maya-root',
    }),
  ]);
  const thread = ledger.threads[0];
  assert.equal(thread.stage, 'same_delivery_batch_exchange');
  assert.equal(thread.has_delivery_time_ties, true);
  assert.match(renderLedger(ledger, { person: 'maya' }), /sibling order.*not claimed/);
});

test('identical duplicate rows deduplicate and conflicting IDs fail closed', () => {
  const incoming = letter({
    id: 'maya-root',
    from: 'maya',
    to: 'hal',
    deliveredAt: '2026-08-02T00:00:00Z',
  });
  assert.equal(build([incoming, incoming]).counts.received, 1);
  assert.throws(
    () => build([incoming, { ...incoming, from: 'claran' }]),
    /conflicting public metadata/,
  );
});

test('thread cycles fail closed', () => {
  assert.throws(
    () => build([
      letter({
        id: 'one',
        from: 'maya',
        to: 'hal',
        deliveredAt: '2026-08-02T00:00:00Z',
        thread: 'two',
      }),
      letter({
        id: 'two',
        from: 'hal',
        to: 'maya',
        deliveredAt: '2026-08-02T12:00:00Z',
        thread: 'one',
      }),
    ]),
    /thread cycle detected/,
  );
});

test('filtered JSON view recomputes counts and people', () => {
  const ledger = build([
    letter({
      id: 'maya-root',
      from: 'maya',
      to: 'hal',
      deliveredAt: '2026-08-02T00:00:00Z',
    }),
    letter({
      id: 'maya-second-root',
      from: 'maya',
      to: 'hal',
      deliveredAt: '2026-08-02T12:00:00Z',
    }),
    letter({
      id: 'claran-root',
      from: 'claran',
      to: 'hal',
      deliveredAt: '2026-08-03T00:00:00Z',
    }),
  ], 2);
  const filtered = filterLedger(ledger, 'maya');
  assert.deepEqual(filtered.counts, {
    received: 2,
    sent: 0,
    threads: 2,
    people: 1,
    pending_outbox: 2,
  });
  assert.deepEqual(filtered.people.map((person) => person.handle), ['maya']);
  assert.equal(filtered.people[0].received, 2);

  const oneThread = filterLedger(ledger, null, 'maya-root');
  assert.equal(oneThread.counts.threads, 1);
  assert.equal(oneThread.people[0].received, 1);
  assert.deepEqual(oneThread.people[0].thread_ids, ['maya-root']);
});

test('source consistency warnings are visible in human output', () => {
  const ledger = buildLedger({
    handle: 'hal',
    rawLetters: [],
    doorstep: {
      handle: 'hal',
      pending_outbox: 0,
      counts: { received: 1, sent: 0 },
    },
    source: { kind: 'fixture', warnings: ['town changed mid-read'] },
  });
  const output = renderLedger(ledger);
  assert.match(output, /WARNING: town changed mid-read/);
  assert.match(output, /WARNING: doorstep counts .* differ from fetched letters/);
  assert.equal(ledger.source.public_read, false);
});

test('snapshot write is atomic, private, readable, and handle-scoped', () => {
  const ledger = build([], 2);
  const directory = mkdtempSync(join(tmpdir(), 'postmark-correspondence-'));
  try {
    const path = join(directory, 'hal.json');
    atomicWriteJson(path, ledger);
    assert.equal(JSON.parse(readFileSync(path, 'utf8')).schema, SCHEMA);
    if (process.platform !== 'win32') assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(readSnapshot(path, 'hal').resident, 'hal');
    assert.throws(() => readSnapshot(path, 'maya'), /belongs to hal, not maya/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('public API client paginates and holds one doorstep revision', async () => {
  const all = [
    letter({
      id: 'root',
      from: 'maya',
      to: 'hal',
      deliveredAt: '2026-08-02T00:00:00Z',
    }),
    letter({
      id: 'reply',
      from: 'hal',
      to: 'maya',
      deliveredAt: '2026-08-02T12:00:00Z',
      thread: 'root',
    }),
    letter({
      id: 'continuation',
      from: 'maya',
      to: 'hal',
      deliveredAt: '2026-08-03T00:00:00Z',
      thread: 'root',
    }),
  ];
  let doorstepReads = 0;
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    response.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/api/doorstep/hal') {
      doorstepReads += 1;
      response.end(JSON.stringify({
        handle: 'hal',
        as_of: 'stable-revision',
        pending_outbox: 0,
        counts: { received: 2, sent: 1 },
      }));
      return;
    }
    if (url.pathname === '/api/letters') {
      const offset = Number(url.searchParams.get('offset'));
      const letters = all.slice(offset, offset + 2);
      response.end(JSON.stringify({ count: letters.length, limit: 2, offset, letters }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ error: 'not found' }));
  });
  await new Promise((accept) => server.listen(0, '127.0.0.1', accept));
  try {
    const { port } = server.address();
    const fetched = await fetchPublicSnapshot({
      handle: 'hal',
      baseUrl: `http://127.0.0.1:${port}/api`,
      pageSize: 2,
      timeoutMs: 2_000,
    });
    assert.equal(fetched.rawLetters.length, 3);
    assert.equal(doorstepReads, 2);
    assert.deepEqual(fetched.sourceWarnings, []);
  } finally {
    await new Promise((accept) => server.close(accept));
  }
});

test('public API client retries when the doorstep revision moves mid-read', async () => {
  const revisions = ['before-crossing', 'after-crossing', 'after-crossing', 'after-crossing'];
  let doorstepReads = 0;
  let letterReads = 0;
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    response.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/api/doorstep/hal') {
      const asOf = revisions[doorstepReads];
      doorstepReads += 1;
      response.end(JSON.stringify({
        handle: 'hal',
        as_of: asOf,
        pending_outbox: 0,
        counts: { received: 0, sent: 0 },
      }));
      return;
    }
    if (url.pathname === '/api/letters') {
      letterReads += 1;
      response.end(JSON.stringify({ count: 0, limit: 200, offset: 0, letters: [] }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ error: 'not found' }));
  });
  await new Promise((accept) => server.listen(0, '127.0.0.1', accept));
  try {
    const { port } = server.address();
    const fetched = await fetchPublicSnapshot({
      handle: 'hal',
      baseUrl: `http://127.0.0.1:${port}/api`,
      timeoutMs: 2_000,
    });
    assert.equal(doorstepReads, 4);
    assert.equal(letterReads, 2);
    assert.equal(fetched.doorstep.as_of, 'after-crossing');
    assert.deepEqual(fetched.sourceWarnings, []);
  } finally {
    await new Promise((accept) => server.close(accept));
  }
});

test('argument parser accepts a positional handle and rejects unsafe ambiguity', () => {
  assert.deepEqual(
    parseArgs(['hal', '--person', 'maya', '--offline']).handle,
    'hal',
  );
  assert.throws(() => parseArgs([]), /resident handle is required/);
  assert.throws(() => parseArgs(['../hal']), /lowercase letters, numbers/);
  assert.throws(() => parseArgs(['hal', '--person', 'Maya']), /lowercase-hyphenated/);
  assert.throws(() => parseArgs(['hal', '--page-size', '201']), /1 to 200/);
  assert.throws(() => parseArgs(['hal', '--offline', '--fixture', 'x.json']), /cannot be used together/);
});

test('malformed public rows fail with a ledger error, not an incidental crash', () => {
  assert.throws(
    () => buildLedger({ handle: 'hal', rawLetters: [null] }),
    LedgerError,
  );
});
