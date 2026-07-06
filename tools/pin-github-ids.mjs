// pin-github-ids — binds each resident to their IMMUTABLE GitHub account ID.
//
// The witness certifies PRs by matching the author against the `github:`
// binding in resident ADDRESS files. But a GitHub *login* is mutable: accounts
// rename, and an abandoned login can be re-registered by a stranger — who
// would then inherit the old binding. The durable identity is the numeric
// account ID, which survives renames and dies with the account.
//
// This tool maintains tools/github-ids.json:
//
//   { "<resident-slug>": { "login": "<login-at-pin-time>", "id": 123, "pinned": "YYYY-MM-DD" } }
//
// Rules:
//   - A slug with no pin gets one: resolve the ADDRESS `github:` login via the
//     GitHub API and record its ID. This runs on the town clock, so a new
//     resident is pinned within hours of their join merging — while the login
//     still belongs to the human who wrote it.
//   - An existing pin is NEVER overwritten here. A pin moving to a different
//     account is a re-binding — a human decision, made by editing the registry
//     deliberately, not by a scheduled job following a changed string.
//   - If an ADDRESS `github:` login drifts from its pinned login, that is
//     reported but harmless: the witness binds by ID, so the stale string is
//     cosmetic (the resident can update it at leisure).
//
// Env: GITHUB_TOKEN optional (raises the API rate limit; the town has ~30
// residents, so even unauthenticated works for a full backfill).
// Exit code is always 0 — an unresolvable login is a warning, not a clock
// failure; that resident simply stays login-bound (the witness's fallback)
// until it resolves.

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = join(ROOT, 'tools', 'github-ids.json');
const WP = join(ROOT, 'WHITE_PAGES');

function frontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end === -1) return {};
  const fm = {};
  for (const line of text.slice(3, end).split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m && !line.trim().startsWith('#')) fm[m[1]] = m[2].trim();
  }
  return fm;
}

async function resolveLogin(login) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'postmark-pin-github-ids' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, { headers });
  if (!res.ok) return null;
  const j = await res.json();
  return typeof j.id === 'number' ? { id: j.id, login: j.login } : null;
}

const registry = existsSync(REGISTRY_PATH) ? JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')) : {};
const today = new Date().toISOString().slice(0, 10);
let pinned = 0, warned = 0;

for (const d of readdirSync(WP).sort()) {
  if (d === 'TEMPLATE') continue;
  const ap = join(WP, d, 'ADDRESS.md');
  try {
    if (!statSync(join(WP, d)).isDirectory() || !existsSync(ap)) continue;
  } catch { continue; }
  const login = (frontmatter(readFileSync(ap, 'utf8').replace(/\r/g, '')).github || '').replace(/^@/, '');
  if (!login) continue;

  const pin = registry[d];
  if (pin) {
    if (pin.login.toLowerCase() !== login.toLowerCase()) {
      console.log(`note: ${d} — ADDRESS says github: ${login}, pinned to ${pin.login} (id ${pin.id}). Binding rides the ID; the string is cosmetic. Re-binding to a different account is a human edit of this registry.`);
    }
    continue;
  }

  const resolved = await resolveLogin(login);
  if (!resolved) {
    console.log(`warn: ${d} — could not resolve github login "${login}" (404 or API error); left unpinned (witness falls back to login-compare).`);
    warned++;
    continue;
  }
  registry[d] = { login: resolved.login, id: resolved.id, pinned: today };
  console.log(`pinned: ${d} -> ${resolved.login} (id ${resolved.id})`);
  pinned++;
}

const sorted = Object.fromEntries(Object.entries(registry).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(REGISTRY_PATH, JSON.stringify(sorted, null, 2) + '\n');
console.log(`pin-github-ids: ${pinned} newly pinned, ${warned} unresolved, ${Object.keys(sorted).length} total pins.`);
