// The HTML witness-lint — makes a resident's ADDRESS.html witness-certifiable.
//
// A resident may author their own page as WHITE_PAGES/<handle>/ADDRESS.html,
// scripts and all — full creative freedom (see the postmark-hub plan, P4b).
// The security boundary is NOT this file: it is ORIGIN ISOLATION. Resident HTML
// serves from a cousin origin (pages.postmark.town/~<handle>/) under strict CSP,
// self-contained, never on the hub origin that holds OAuth sessions — the exact
// github.com / github.io split, for the exact reason. So this lint deliberately
// does NOT sanitize, rewrite, or neuter a resident's page. It is a *courtesy
// gate*, not a firewall: it checks two things a self-contained, size-polite page
// must satisfy, and when a page misses them it hands the PR to a human in the
// witness's own voice — it never edits the page and never rejects a resident.
//
//   1. Size courtesy — the page ≤ 200KB, and the page plus every sibling asset
//      it pulls in ≤ 1MB (the folder-letter class numbers; the repo keeps every
//      committed byte forever, so bytes are a shared cost).
//   2. Self-contained — no page loads anything off the town. Scripts, styles,
//      and images must be local (a relative path inside the author's own folder)
//      or inlined (`data:` URIs are fine); the only outward link allowed is a
//      plain <a href> to postmark.town or github.com. Anything else — an
//      external <script src>, a CDN stylesheet, an off-town <a>, a path that
//      escapes the author's folder — routes to a human.
//
// Composes WITH the witness (tools/witness.mjs), not beside it. It speaks the
// same base-branch-truth, read-only, route-to-human-never-reject idiom, and
// exposes `lintResidentHtml()` returning the witness's { ok, reasons } shape.
// LIVE since the serving half landed (pages.postmark.town origin isolation,
// 2026-07-09). The wiring is exactly the two edits planned while dormant:
//   • witness rule 5 carves out WHITE_PAGES/<handle>/ADDRESS.html plus .css/.js
//     assets inside the author's own folder, and
//   • the workflow's data-only lint phase (the same phase tools/lint.mjs runs
//     in, after rules 1-6 certify — PR files are checked out as DATA, never
//     executed) calls this tool over the touched handles' pages and routes on
//     a non-zero exit, exactly like the tools/lint.mjs ERROR step.
//
// Run from anywhere:  node tools/html-witness-lint.mjs [--root <dir>] [file ...]
// Zero dependencies — Node built-ins only.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PAGE_MAX = 200_000;      // one page, ≤ 200KB
export const TOTAL_MAX = 1_000_000;   // page + its assets, ≤ 1MB
// Outward anchors only. starforge-atelier.online is the town's sibling site —
// the herbarium and the founding households' longer rooms live there, and the
// hub itself points at it — so a resident page may anchor to it too.
export const ALLOWED_HOSTS = ['postmark.town', 'github.com', 'starforge-atelier.online'];

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const kb = (n) => `${Math.round(n / 1000)}KB`;

const hostAllowed = (host) =>
  ALLOWED_HOSTS.some((a) => host === a || host.endsWith(`.${a}`));

// Pull every URL-bearing attribute out of the page. Regex, not a DOM — the same
// deliberate zero-dep choice tools/lint.mjs makes for links. We over-collect
// rather than under-collect: a ref we can't classify as safe routes to a human,
// which is the safe direction for a courtesy gate.
function extractRefs(html) {
  const refs = []; // { attr, tag, value }
  const tagRe = /<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let t;
  while ((t = tagRe.exec(html))) {
    const tag = t[1].toLowerCase();
    const attrs = t[2];
    for (const attr of ['src', 'href', 'poster']) {
      const m = new RegExp(`\\b${attr}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(attrs);
      if (m) refs.push({ attr, tag, value: (m[2] ?? m[3] ?? m[4] ?? '').trim() });
    }
    // srcset: comma-separated "url descriptor" candidates — the url is the first token
    const ss = /\bsrcset\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
    if (ss) for (const cand of (ss[2] ?? ss[3] ?? '').split(','))
      { const u = cand.trim().split(/\s+/)[0]; if (u) refs.push({ attr: 'src', tag, value: u }); }
  }
  // CSS url(...) anywhere (style blocks/attributes) — an external fetch vector too
  const urlRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  let u;
  while ((u = urlRe.exec(html))) refs.push({ attr: 'url', tag: 'css', value: u[2].trim() });
  return refs;
}

// One ADDRESS.html. Returns { ok, reasons, page_bytes, total_bytes } — reasons
// in the witness's route-to-human voice. NEVER writes anything.
export function lintResidentHtml(htmlPath, { root = DEFAULT_ROOT } = {}) {
  const reasons = [];
  const relPath = relative(root, htmlPath).replace(/\\/g, '/');
  const m = /^WHITE_PAGES\/([^/]+)\/ADDRESS\.html$/.exec(relPath);
  if (!m) return { ok: false, reasons: [`\`${relPath}\` is not a WHITE_PAGES/<handle>/ADDRESS.html page.`], page_bytes: 0, total_bytes: 0 };
  const handleDir = join(root, 'WHITE_PAGES', m[1]);
  const htmlDir = dirname(htmlPath);

  let buf;
  try { buf = readFileSync(htmlPath); }
  catch { return { ok: false, reasons: [`\`${relPath}\` can't be read.`], page_bytes: 0, total_bytes: 0 }; }
  const html = buf.toString('utf8');
  const pageBytes = buf.length;

  if (pageBytes > PAGE_MAX)
    reasons.push(`the page \`${relPath}\` is ${kb(pageBytes)} — over the ${kb(PAGE_MAX)} page courtesy (the repo keeps every byte forever; the Postmaster can help trim it). A human will look.`);

  const assetBytes = new Map(); // resolved abs path -> bytes, deduped
  for (const ref of extractRefs(html)) {
    const raw = ref.value;
    if (!raw) continue;
    if (/^(#|data:|mailto:|tel:|javascript:)/i.test(raw)) continue; // inline / self-contained / not a fetch

    const isExternal = /^(https?:)?\/\//i.test(raw) || /^[a-z][a-z0-9+.-]*:/i.test(raw);
    if (isExternal) {
      // The one outward exception: a plain <a href> to postmark.town / github.com.
      if (ref.tag === 'a' && ref.attr === 'href') {
        let host = '';
        try { host = new URL(raw.replace(/^\/\//, 'https://')).hostname.toLowerCase(); } catch { /* unparseable */ }
        if (host && hostAllowed(host)) continue;
        reasons.push(`\`${relPath}\` links out to \`${raw}\` — off-town anchors aren't certified here (plain links to postmark.town or github.com are fine). A human will look.`);
      } else {
        reasons.push(`\`${relPath}\` loads \`${raw}\` from off the town (a \`${ref.tag} ${ref.attr}\`) — a resident page must be self-contained: scripts, styles, and images local or inlined (\`data:\` is fine). A human will look.`);
      }
      continue;
    }

    // relative — must resolve inside the author's own folder
    const clean = raw.split(/[?#]/)[0];
    if (!clean) continue;
    const abs = resolve(htmlDir, clean);
    const inside = abs === handleDir || abs.startsWith(handleDir + sep);
    if (!inside) {
      reasons.push(`\`${relPath}\` reaches outside your own pages with \`${raw}\` — a page may only use assets from its own folder. A human will look.`);
      continue;
    }
    // embedded refs (everything but a navigation <a href>) must ship their asset
    const isNavAnchor = ref.tag === 'a' && ref.attr === 'href';
    if (existsSync(abs) && statSync(abs).isFile()) {
      assetBytes.set(abs, statSync(abs).size);
    } else if (!isNavAnchor) {
      reasons.push(`\`${relPath}\` references \`${raw}\`, which isn't in your pages — a self-contained page ships its assets. A human will look.`);
    }
  }

  const totalBytes = pageBytes + [...assetBytes.values()].reduce((a, b) => a + b, 0);
  if (totalBytes > TOTAL_MAX)
    reasons.push(`\`${relPath}\` with its assets totals ${kb(totalBytes)} — over the ${kb(TOTAL_MAX)} page-and-assets courtesy. A human will look.`);

  return { ok: reasons.length === 0, reasons, page_bytes: pageBytes, total_bytes: totalBytes };
}

// Every WHITE_PAGES/<handle>/ADDRESS.html under root (skips TEMPLATE).
export function findAddressHtml(root = DEFAULT_ROOT) {
  const wp = join(root, 'WHITE_PAGES');
  if (!existsSync(wp)) return [];
  const out = [];
  for (const d of readdirSync(wp)) {
    if (d === 'TEMPLATE') continue;
    let isDir = false;
    try { isDir = statSync(join(wp, d)).isDirectory(); } catch { /* skip */ }
    if (!isDir) continue;
    const p = join(wp, d, 'ADDRESS.html');
    if (existsSync(p)) out.push(p);
  }
  return out;
}

// ── CLI (mirrors tools/lint.mjs: report, exit non-zero on any route) ─────────
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  let root = DEFAULT_ROOT;
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root') root = resolve(args[++i]);
    else files.push(resolve(args[i]));
  }
  const targets = files.length ? files : findAddressHtml(root);
  let routed = 0;
  if (!targets.length) {
    console.log('No ADDRESS.html pages found — nothing to lint (resident HTML is dormant until the serving half lands).');
    process.exit(0);
  }
  for (const t of targets) {
    const { ok, reasons } = lintResidentHtml(t, { root });
    const rel = relative(root, t).replace(/\\/g, '/');
    if (ok) console.log(`[ok]    ${rel}`);
    else { routed++; for (const r of reasons) console.log(`[route] ${r}`); }
  }
  console.log(`\nLinted ${targets.length} resident page(s); ${routed} would route to a human.`);
  // Non-zero only when a page would route — so a future workflow step can gate
  // and hand the PR to a human, exactly as the tools/lint.mjs ERROR step does.
  process.exit(routed ? 1 : 0);
}
