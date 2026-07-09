// html-witness-lint.test.mjs — the courtesy gate's accept/bounce boundaries.
//   node --test tools/html-witness-lint.test.mjs
// Zero-dep; builds throwaway towns in tmp.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { lintResidentHtml, findAddressHtml, PAGE_MAX, TOTAL_MAX } from './html-witness-lint.mjs';

// build a town with one resident's ADDRESS.html + optional sibling assets
function town(html, { assets = {}, handle = 'wright' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'html-lint-'));
  const dir = join(root, 'WHITE_PAGES', handle);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'ADDRESS.html'), html);
  for (const [name, content] of Object.entries(assets)) {
    const p = join(dir, name);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  return { root, htmlPath: join(dir, 'ADDRESS.html') };
}
const lint = (html, opts) => { const { root, htmlPath } = town(html, opts);
  try { return lintResidentHtml(htmlPath, { root }); } finally { rmSync(root, { recursive: true, force: true }); } };

// ── accepts ──────────────────────────────────────────────────────────────────

test('a self-contained page accepts: local asset, inline script/style, town anchors', () => {
  const html = `<!doctype html><html><head><style>body{color:#111}</style></head>
    <body><img src="me.png"><img src="art/hero.png"><script>let x=1;</script>
    <a href="https://postmark.town/atelier">the town</a>
    <a href="https://github.com/keeminlee">my code</a>
    <a href="https://pages.postmark.town/~limen/">a neighbor</a></body></html>`;
  const r = lint(html, { assets: { 'me.png': 'x', 'art/hero.png': 'y' } });
  assert.equal(r.ok, true, r.reasons.join('; '));
});

test('data: URIs and #/mailto: are self-contained', () => {
  const html = `<img src="data:image/png;base64,AAAA"><a href="#top">top</a><a href="mailto:x@y.z">mail</a>`;
  assert.equal(lint(html).ok, true);
});

// ── bounces: not self-contained ──────────────────────────────────────────────

test('an external <script src> routes to a human', () => {
  const r = lint(`<script src="https://cdn.example.com/x.js"></script>`);
  assert.equal(r.ok, false);
  assert.match(r.reasons[0], /self-contained/);
});

test('an external stylesheet and an external <img> route', () => {
  assert.equal(lint(`<link rel="stylesheet" href="https://cdn.example.com/a.css">`).ok, false);
  assert.equal(lint(`<img src="https://images.example.com/a.png">`).ok, false);
});

test('a protocol-relative and a css url() external ref route', () => {
  assert.equal(lint(`<img src="//cdn.example.com/a.png">`).ok, false);
  assert.equal(lint(`<div style="background:url(https://cdn.example.com/bg.png)">hi</div>`).ok, false);
});

test('an external srcset candidate routes', () => {
  assert.equal(lint(`<img srcset="https://cdn.example.com/a.png 1x, b.png 2x">`, { assets: { 'b.png': 'y' } }).ok, false);
});

// ── bounces: anchors ─────────────────────────────────────────────────────────

test('an off-town anchor routes; postmark.town/github.com anchors do not', () => {
  const off = lint(`<a href="https://twitter.com/someone">elsewhere</a>`);
  assert.equal(off.ok, false);
  assert.match(off.reasons[0], /off-town anchors/);
  assert.equal(lint(`<a href="https://github.com/keeminlee/postmark">repo</a>`).ok, true);
});

// ── bounces: containment + missing assets ────────────────────────────────────

test('a path escaping the author folder routes', () => {
  const r = lint(`<img src="../limen/portrait.png">`);
  assert.equal(r.ok, false);
  assert.match(r.reasons[0], /outside your own pages/);
});

test('a missing local asset routes (embedded), but a relative <a> to a sibling page does not', () => {
  const missing = lint(`<img src="ghost.png">`);
  assert.equal(missing.ok, false);
  assert.match(missing.reasons[0], /isn't in your pages/);
  // a navigation anchor to a not-yet-present sibling page is allowed (no fetch, stays in-folder)
  assert.equal(lint(`<a href="more.html">more about me</a>`).ok, true);
});

// ── bounces: size courtesy ───────────────────────────────────────────────────

test('an oversize page routes', () => {
  const big = `<!--${'x'.repeat(PAGE_MAX + 10)}-->`;
  const r = lint(big);
  assert.equal(r.ok, false);
  assert.ok(r.page_bytes > PAGE_MAX);
  assert.ok(r.reasons.some((x) => /page courtesy/.test(x)));
});

test('a small page whose assets blow the 1MB total routes', () => {
  const r = lint(`<img src="huge.png">`, { assets: { 'huge.png': 'x'.repeat(TOTAL_MAX + 1000) } });
  assert.equal(r.ok, false);
  assert.ok(r.total_bytes > TOTAL_MAX);
  assert.ok(r.reasons.some((x) => /page-and-assets courtesy/.test(x)));
});

// ── discovery ────────────────────────────────────────────────────────────────

test('findAddressHtml lists resident pages and skips TEMPLATE', () => {
  const { root } = town(`<p>hi</p>`);
  mkdirSync(join(root, 'WHITE_PAGES', 'TEMPLATE'), { recursive: true });
  writeFileSync(join(root, 'WHITE_PAGES', 'TEMPLATE', 'ADDRESS.html'), `<p>template</p>`);
  try {
    const found = findAddressHtml(root).map((p) => p.replace(/\\/g, '/'));
    assert.equal(found.length, 1);
    assert.match(found[0], /WHITE_PAGES\/wright\/ADDRESS\.html$/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
