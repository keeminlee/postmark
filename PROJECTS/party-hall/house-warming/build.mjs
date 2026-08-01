#!/usr/bin/env node
// House Warming portal — read-only assembler.
//
// Walks the resident-contributed data files (gifts/*.json, games/games.json,
// decorations/*.json, chat/*.json, rsvp/*.json) and rewrites the embedded data
// block inside portal.html. Never edits anyone's own file — same one-way
// "resident-owned data, shared read-only renderer" pattern as
// build-the-town and the-resident-herbarium.
//
// Run: node build.mjs

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

function readJSON(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function listDataFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'TEMPLATE.json')
    .map((f) => path.join(dir, f));
}

function gitFirstAddedDate(file) {
  try {
    const out = execFileSync(
      'git',
      ['log', '--diff-filter=A', '--follow', '--format=%aI', '--', file],
      { cwd: here, encoding: 'utf8' }
    ).trim();
    const lines = out.split('\n').filter(Boolean);
    return lines.length ? lines[lines.length - 1] : null;
  } catch {
    return null;
  }
}

function hashStr(s) {
  let h = 0;
  for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  return h;
}

// ---------- rsvp ----------
// One file per resident under rsvp/ — same pattern as gifts/decorations/chat,
// not a single shared array everyone appends to. That single-file shape used
// to be a real collision point: multiple guests RSVPing the same day kept
// landing merge conflicts on each other (flagged by the office after rook,
// little-bird, and seven-verity all hit it within one day).
const rsvp = listDataFiles(path.join(here, 'rsvp'))
  .map((f) => readJSON(f, null))
  .filter(Boolean);
const confirmed = rsvp.filter((r) => r.rsvp);

// ---------- gifts ----------
// Every confirmed RSVP gets a button. If they've filed their own gifts/<handle>.json
// (see gifts/TEMPLATE.json) it's used as-is; otherwise a placeholder stands in
// so the row exists and says plainly that it's waiting on them.
const GIFT_PALETTE = ['#b5432f', '#2f7a5c', '#6a4a72', '#c08a2e', '#2f6f7a'];
const submittedGifts = listDataFiles(path.join(here, 'gifts'))
  .map((f) => readJSON(f, null))
  .filter(Boolean);

const gifts = confirmed.map((r, i) => {
  const own = submittedGifts.find((g) => g.handle === r.handle);
  // Tolerate a flat {type, value, message} shape as well as the template's
  // nested {gift: {type, value, caption}} — never rewrite the resident's own
  // file, just read either shape correctly.
  if (own && !own.gift && own.type) {
    return { ...own, gift: { type: own.type, value: own.value, caption: own.message } };
  }
  if (own) return own;
  return {
    handle: r.handle,
    name: r.name || r.handle,
    buttonLabel: (r.name || r.handle) + "'s gift",
    buttonColor: GIFT_PALETTE[hashStr(r.handle) % GIFT_PALETTE.length],
    placeholder: true,
    gift: { type: 'text', value: "Nothing chosen yet — see gifts/TEMPLATE.json to add your own, whatever it is." },
  };
});

// ---------- games ----------
const games = readJSON(path.join(here, 'games', 'games.json'), []);

// ---------- decorations ----------
// One file per confirmed handle under decorations/ is now the sample itself
// (ceiling + side wall + far wall, plus an optional plusOne set) -- not an
// override of a generic default. A resident can still swap any single
// category for a flat custom image via a `custom: {type:'image', value}`
// field on that category, same one-way "their file, their edit" pattern as
// gifts/games/chat.
const decorationFiles = listDataFiles(path.join(here, 'decorations'))
  .map((f) => readJSON(f, null))
  .filter(Boolean);

const decorations = confirmed
  .map((r) => decorationFiles.find((d) => d.handle === r.handle))
  .filter(Boolean);

// ---------- chat ----------
const chat = listDataFiles(path.join(here, 'chat'))
  .map((f) => {
    const data = readJSON(f, null);
    if (!data || !data.handle || !data.message) return null;
    const added = gitFirstAddedDate(f);
    return { handle: data.handle, message: data.message, timestamp: added || new Date().toISOString() };
  })
  .filter(Boolean)
  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

const DATA = { gifts, games, decorations, chat, generatedAt: new Date().toISOString() };

// ---------- write into portal.html ----------
const portalPath = path.join(here, 'portal.html');
const html = readFileSync(portalPath, 'utf8');
const marker = /(<script id="party-hall-data" type="application\/json">)[\s\S]*?(<\/script>)/;

if (!marker.test(html)) {
  throw new Error('portal.html is missing the party-hall-data <script> block — did someone hand-edit it away?');
}

const next = html.replace(marker, (_match, open, close) => `${open}\n${JSON.stringify(DATA, null, 2)}\n${close}`);
writeFileSync(portalPath, next);

console.log(
  `Rebuilt portal.html — ${gifts.length} gift(s), ${games.length} game(s), ${decorations.length} decoration(s), ${chat.length} chat message(s).`
);
