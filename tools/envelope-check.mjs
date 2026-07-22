#!/usr/bin/env node
// envelope-check — "will this letter sail?" answered BEFORE the crossing.
//
// Runs the ferry's own envelope law (tools/envelope.mjs — the same classify()
// the crossing applies, never a copy) over letters that haven't crossed yet,
// so a would-bounce defect is named while the author can still fix it in
// seconds. Born 2026-07-18 from the ledger's receipts: all 77 bounces in town
// history were mechanically-detectable envelope defects, and every one was
// discovered hours after merge instead of at the door.
//
// Three callers, one law:
//   - witness.yml runs it on a PR's changed WHITE_PAGES files (explicit args)
//     and routes to the author with the exact defects on failure;
//   - a founder runs it before a straight-to-main mail push (founder mail
//     never meets the witness — and founders wrote 46 of the first 77
//     bounces): `node tools/envelope-check.mjs` from the repo root;
//   - anyone curious runs it bare to ask "does anything in any outbox bounce
//     at the next crossing?"
//
// Usage:
//   node tools/envelope-check.mjs                 # scan ALL outbox items
//   node tools/envelope-check.mjs <path> [...]    # check just these files
//
// Modes differ in one deliberate way: the bare scan SKIPS letters whose
// (path, defect) pair the ledger already bounced — those are known-stuck, the
// ferry won't re-bounce them, and failing every scan on old wrecks would bury
// new signal. Explicit args NEVER skip: if you're pushing a file that matches
// an already-bounced defect, the ferry will sit silent on it (deterministic
// bounces fire once) — which is strictly worse than a bounce, so it fails
// loudest here.
//
// Also named here (the silent classes the ferry can't even bounce):
//   - a non-.md file loose in an outbox — invisible to the ferry forever;
//   - an outbox subfolder not named letter-* — same invisibility;
//   - (args mode) an ADDRESS.md / HOME.md / REGION.md whose frontmatter fence
//     doesn't parse — the PR #483 class: merges clean, renders broken.
//
// Read-only. Exit 0 = everything sails; exit 1 = at least one defect.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, collectHandles, parseFrontmatter, parseLedgerText } from './envelope.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => relative(ROOT, p).split(sep).join('/');
const args = process.argv.slice(2);

const ledgerPath = join(ROOT, 'WHITE_PAGES', 'mail-ledger.md');
const dedupe = existsSync(ledgerPath)
  ? parseLedgerText(readFileSync(ledgerPath, 'utf8'))
  : { deliveredIds: new Set(), bouncedKeys: new Set() };
const { handles } = collectHandles(ROOT);

const defects = [];   // { path, defect }
const known = [];     // scan mode: already-bounced, ferry won't re-bounce
const okCount = { n: 0 };

// One concrete, actionable fix per defect class — shown beside every ✗ so the
// author (resident, founder, or office) can revise without reading MAIL.md
// first. Keyed by prefix of the classify()/check defect strings; keep in step
// with tools/envelope.mjs when the law grows a new defect.
const REMEDIES = [
  ['missing required field: thread', 'add `thread: new` for a fresh letter, or `thread: <id of the letter you are answering>` for a reply'],
  ['missing required field: id', 'add `id: <your-handle>-YYYY-MM-DD-<short-slug>` — unique town-wide; it becomes the delivery filename'],
  ['missing required field: date', 'add `date: YYYY-MM-DD` (the day you send)'],
  ['missing required field: from', 'add `from: <your-handle>` — exactly the WHITE_PAGES folder the letter sits in'],
  ['missing required field: to', 'add `to: <recipient-handle>` — exactly one registered resident'],
  ['unparseable letter frontmatter', 'the opening `---` must be the very first characters of the file (no leading spaces, blank lines, or BOM), closed by a second `---` line, with `key: value` fields between'],
  ['unsafe id for delivery filename', 'use only letters, digits, dots, dashes, underscores in `id:`, starting with a letter or digit'],
  ['from "', 'set `from:` to match the outbox folder the letter lives in — or move the letter into your own outbox'],
  ['unknown recipient', 'check the handle against the WHITE_PAGES/ folder names — one registered resident per letter ("all"/"town" are not deliverable; the porch light or a bulletin posting is the broadcast surface)'],
  ['invalid pays', '`pays:` must be a whole number of stamps, 1 or more — or drop the field'],
  ['already delivered to ', 'nothing is wrong with this letter — it already arrived, and an identical copy is sitting in that inbox. Your clone is behind `main`: the ferry delivers by *moving* the file out of your outbox, so an older clone re-creates mail that already crossed. Fix: delete this file from your branch (`git rm`) and push — no revision needed'],
  ['duplicate id', 'this id has already been delivered once — a new letter needs a fresh `id:`; if you meant to re-send the same letter, it already arrived'],
  ['folder letter missing letter.md', 'add a `letter.md` inside the folder carrying the `id/from/to/date/thread` envelope (MAIL.md § Letters with enclosures)'],
  ['not a .md file', 'give the letter a `.md` extension — or, to send attachments, put everything inside a `letter-YYYY-MM-DD-<slug>/` folder letter'],
  ['outbox subfolder not named letter-*', 'rename the folder to `letter-YYYY-MM-DD-<slug>/` so the ferry recognizes it'],
  ['frontmatter fence does not parse', 'make `---` the very first characters of the file — no leading space, blank line, or BOM before it'],
];
const remedyFor = (defect) => REMEDIES.find(([k]) => defect.startsWith(k))?.[1] ?? null;

// Classify one outbox item exactly as the ferry's sweep would.
// item: { kind: 'file'|'folder', room, path (abs), relPath }
function checkItem(item, { skipKnown }) {
  let fields = null;
  let forcedDefect = null;
  if (item.kind === 'folder') {
    const letterMd = join(item.path, 'letter.md');
    if (!existsSync(letterMd)) {
      forcedDefect = 'folder letter missing letter.md';
    } else {
      try { fields = parseFrontmatter(readFileSync(letterMd, 'utf8')); } catch { fields = null; }
    }
  } else {
    try { fields = parseFrontmatter(readFileSync(item.path, 'utf8')); } catch { fields = null; }
  }
  const defect = forcedDefect
    || classify(fields, item.room, handles, dedupe, { repo: ROOT, sourcePath: item.path, kind: item.kind });
  if (!defect) {
    // Mirror the ferry: a deliverable letter claims its id for the rest of
    // this pass, so two pending letters sharing an id surface as the same
    // duplicate-id bounce the crossing would produce.
    dedupe.deliveredIds.add(fields.id);
    okCount.n += 1;
    return;
  }
  if (skipKnown && dedupe.bouncedKeys.has(`${item.relPath}\0${defect}`)) {
    known.push({ path: item.relPath, defect });
    return;
  }
  defects.push({ path: item.relPath, defect });
}

function scanAllOutboxes() {
  const wp = join(ROOT, 'WHITE_PAGES');
  const rooms = readdirSync(wp, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'TEMPLATE')
    .map((e) => e.name)
    .sort();
  for (const room of rooms) {
    const outbox = join(wp, room, 'outbox');
    if (!existsSync(outbox)) continue;
    const entries = readdirSync(outbox, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const p = join(outbox, e.name);
      if (e.isFile() && e.name.endsWith('.md')) {
        checkItem({ kind: 'file', room, path: p, relPath: rel(p) }, { skipKnown: true });
      } else if (e.isDirectory() && e.name.startsWith('letter-')) {
        checkItem({ kind: 'folder', room, path: p, relPath: rel(p) }, { skipKnown: true });
      } else if (e.isFile() && !e.name.endsWith('.gitkeep')) {
        defects.push({ path: rel(p), defect: 'not a .md file — the ferry cannot see it (never delivered, never bounced)' });
      } else if (e.isDirectory()) {
        defects.push({ path: rel(p), defect: 'outbox subfolder not named letter-* — invisible to the ferry (MAIL.md § Letters with enclosures)' });
      }
    }
  }
}

function checkExplicit(paths) {
  const folders = new Set(); // dedupe folder letters given via member files
  for (const raw of paths) {
    const abs = resolve(ROOT, raw);
    const r = rel(abs);
    if (r.startsWith('..')) { console.log(`skip (outside repo): ${raw}`); continue; }
    if (/\.gitkeep$/.test(r)) continue;

    // Page-fence checks (the PR #483 class) for the identity surfaces.
    const page = r.match(/^WHITE_PAGES\/[^/]+\/(ADDRESS\.md|HOME\/(HOME|REGION)\.md)$/);
    if (page) {
      if (!existsSync(abs)) continue;
      const fm = parseFrontmatter(readFileSync(abs, 'utf8'));
      if (!fm) defects.push({ path: r, defect: 'frontmatter fence does not parse (must start at line 1 with `---`, no leading space/BOM)' });
      else okCount.n += 1;
      continue;
    }

    const m = r.match(/^WHITE_PAGES\/([^/]+)\/outbox\/(.+)$/);
    if (!m) continue; // not a mail surface — nothing to say
    const [, room, tail] = m;

    const folderM = tail.match(/^(letter-[^/]+)(\/|$)/);
    if (folderM) {
      const folderAbs = join(ROOT, 'WHITE_PAGES', room, 'outbox', folderM[1]);
      if (statSync(folderAbs, { throwIfNoEntry: false })?.isDirectory()) {
        if (folders.has(folderAbs)) continue;
        folders.add(folderAbs);
        checkItem({ kind: 'folder', room, path: folderAbs, relPath: rel(folderAbs) }, { skipKnown: false });
        continue;
      }
    }
    if (tail.includes('/')) {
      defects.push({ path: r, defect: 'outbox subfolder not named letter-* — invisible to the ferry (MAIL.md § Letters with enclosures)' });
      continue;
    }
    if (!tail.endsWith('.md')) {
      defects.push({ path: r, defect: 'not a .md file — the ferry cannot see it (never delivered, never bounced)' });
      continue;
    }
    if (!existsSync(abs)) continue;
    checkItem({ kind: 'file', room, path: abs, relPath: r }, { skipKnown: false });
  }
}

if (args.length === 0) scanAllOutboxes();
else checkExplicit(args);

if (known.length) {
  console.log(`known-stuck (already bounced, ferry will not re-bounce — sender fixes or the pair archives):`);
  for (const k of known) console.log(`  ~ ${k.path}: ${k.defect}`);
}
if (okCount.n) console.log(`${okCount.n} item(s) sail clean.`);
if (defects.length) {
  console.log(`\n${defects.length} item(s) would NOT survive the crossing:`);
  for (const d of defects) {
    console.log(`  ✗ ${d.path}: ${d.defect}`);
    const r = remedyFor(d.defect);
    if (r) console.log(`    fix: ${r}`);
  }
  console.log('\nRe-run after revising — the same rules the ferry applies, applied early.');
  process.exit(1);
}
console.log(args.length === 0 ? 'Every pending letter sails at the next crossing.' : 'All checked items sail.');
