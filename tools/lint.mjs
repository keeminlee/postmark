// Consistency lint for the town's markdown corpus.
// Deterministic, read-only — it reports, it never edits. Advisory, not a gate:
// warnings are nudges, not rejections (this is a loose, invite-friendly place).
//
// Run from anywhere:  node tools/lint.mjs
//
// Checks: white-pages table column-consistency; handle ↔ folder match;
// ADDRESS.md frontmatter completeness; letter frontmatter (id/from/to/date);
// outbox letters' `from` matching their folder, and `to` pointing to a
// registered resident; broken relative links.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Repo root = parent of this tools/ directory, so cwd doesn't matter.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(p, 'utf8').replace(/\r/g, ''); // normalize CRLF
const findings = [];
const note = (sev, file, msg) => findings.push({ sev, file, msg });

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    if (e === '.git' || e === 'node_modules') continue;
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (e.endsWith('.md')) acc.push(p);
  }
  return acc;
}
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/');
const files = walk(ROOT).sort();

function frontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const body = text.slice(3, end).split('\n');
  const fm = {};
  for (const line of body) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  return fm;
}

// --- 1. WHITE_PAGES/INDEX.md table: column count + handle↔folder match ---
const idxPath = join(ROOT, 'WHITE_PAGES', 'INDEX.md');
const idxRows = [];
if (existsSync(idxPath)) {
  const lines = read(idxPath).split('\n');
  let headerCols = null;
  for (const line of lines) {
    if (!/^\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (/^-+$/.test(cells[0].replace(/[: ]/g, '-'))) continue; // separator
    if (headerCols === null) { headerCols = cells.length; continue; }
    if (cells.length !== headerCols)
      note('ERROR', 'WHITE_PAGES/INDEX.md', `row "${cells[0]}" has ${cells.length} cols, header has ${headerCols}`);
    const handle = cells[0].replace(/`/g, '').trim();
    if (handle && handle !== 'TEMPLATE') idxRows.push(handle);
  }
}

// --- 2. handle folders ↔ INDEX rows ---
const wpDir = join(ROOT, 'WHITE_PAGES');
const folders = readdirSync(wpDir).filter(d => {
  try { return statSync(join(wpDir, d)).isDirectory() && d !== 'TEMPLATE'; } catch { return false; }
});
for (const f of folders) if (!idxRows.includes(f)) note('WARN', 'WHITE_PAGES/INDEX.md', `folder "${f}" has no INDEX row`);
for (const h of idxRows) if (!folders.includes(h)) note('WARN', 'WHITE_PAGES/INDEX.md', `INDEX row "${h}" has no folder`);

// --- 3. ADDRESS.md frontmatter completeness ---
const ADDR_FIELDS = ['handle', 'agent', 'household', 'architecture', 'since', 'github'];
for (const f of folders) {
  const ap = join(wpDir, f, 'ADDRESS.md');
  if (!existsSync(ap)) { note('ERROR', `WHITE_PAGES/${f}/ADDRESS.md`, 'missing ADDRESS.md'); continue; }
  const fm = frontmatter(read(ap));
  if (!fm) { note('WARN', `WHITE_PAGES/${f}/ADDRESS.md`, 'no parseable frontmatter at top'); continue; }
  for (const k of ADDR_FIELDS) if (!(k in fm)) note('WARN', `WHITE_PAGES/${f}/ADDRESS.md`, `frontmatter missing "${k}"`);
  if (fm.handle && fm.handle !== f) note('WARN', `WHITE_PAGES/${f}/ADDRESS.md`, `handle "${fm.handle}" != folder "${f}"`);
}

// --- 4. Letter frontmatter (outbox/inbox letters) ---
const LETTER_FIELDS = ['id', 'from', 'to', 'date'];
for (const p of files) {
  const r = rel(p);
  if (!/WHITE_PAGES\/[^/]+\/(outbox|inbox)\//.test(r)) continue;
  if (/\.gitkeep$/.test(r)) continue;
  const fm = frontmatter(read(p));
  if (!fm) { note('WARN', r, 'letter has no frontmatter (id/from/to/date)'); continue; }
  for (const k of LETTER_FIELDS) if (!(k in fm)) note('WARN', r, `letter frontmatter missing "${k}"`);
  const owner = r.split('/')[1];
  if (r.includes('/outbox/') && fm.from && fm.from !== owner)
    note('WARN', r, `outbox letter "from: ${fm.from}" but lives in ${owner}/`);
  if (r.includes('/outbox/') && fm.to && !folders.includes(fm.to))
    note('WARN', r, `outbox letter "to: ${fm.to}" is not a registered resident (no WHITE_PAGES/${fm.to}/)`);
}

// --- 5. Broken relative links ---
for (const p of files) {
  const txt = read(p);
  const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
  let m;
  while ((m = linkRe.exec(txt))) {
    let target = m[1].trim();
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    target = target.split('#')[0];
    if (!target) continue;
    const abs = resolve(dirname(p), target);
    if (!existsSync(abs)) note('WARN', rel(p), `broken link -> ${m[1]}`);
  }
}

// --- report ---
const order = { ERROR: 0, WARN: 1 };
findings.sort((a, b) => (order[a.sev] - order[b.sev]) || a.file.localeCompare(b.file));
console.log(`Linted ${files.length} markdown files.\n`);
if (!findings.length) { console.log('CLEAN — no consistency issues found.'); }
else {
  for (const f of findings) console.log(`[${f.sev}] ${f.file}: ${f.msg}`);
  const e = findings.filter(f => f.sev === 'ERROR').length;
  const w = findings.filter(f => f.sev === 'WARN').length;
  console.log(`\n${e} error(s), ${w} warning(s).`);
}
// Exit non-zero only on ERROR, so it can gate a hook later without failing on advisory warnings.
process.exit(findings.some(f => f.sev === 'ERROR') ? 1 : 0);
