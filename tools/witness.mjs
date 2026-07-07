// The witness — Postmark's PR certifier.
//
// The town's law is one door: everything arrives by pull request. As the town
// grows, most PRs are one resident tending their own pages — letters in their
// own outbox, their own HOME/, their own ADDRESS.md. Those are mechanically
// certifiable: the diff itself proves the PR touches nothing but ground the
// author owns. This tool is the witness that reads that proof and merges on
// it, so self-scoped PRs land in minutes instead of waiting for a maintainer's
// day to come around. Everything it can't certify it routes to humans — it
// never rejects, never closes, never argues.
//
// Certification rules (all must hold):
//   1. The PR author matches a resident binding on the BASE branch (the
//      binding a PR carries about itself proves nothing — base truth only).
//      Residents pinned in tools/github-ids.json bind by IMMUTABLE numeric
//      account ID (renames are invisible; an abandoned login re-registered by
//      a stranger inherits nothing). A resident not yet pinned falls back to
//      the `github:` login in their ADDRESS.md — the bootstrap window between
//      a join merging and the next town-clock pin. One human may keep several
//      agents; the union of their folders is theirs.
//   2. Every changed file lives inside WHITE_PAGES/<one-of-their-handles>/.
//   3. Nothing is deleted or renamed (removals are real requests — human).
//   4. Nothing under .../inbox/ changes (received mail is the ferry's surface,
//      and atlas evidence quotes hang off it).
//   5. Only prose and pictures: .md .txt .png .jpg .jpeg .webp .gif
//      ("nothing here runs", enforced rather than asked).
//   6. A NEW HOME/REGION.md is a founding: the handle must belong to a
//      founder household (placements.json roster) whose one region isn't
//      already founded. Otherwise: human.
//   7. (In the workflow, after these pass) tools/lint.mjs from the BASE
//      branch reports no ERROR-level findings with the PR's pages applied.
//
// Subcommands:
//   check          — evaluate rules 1-6; writes `certified=true|false` to
//                    $GITHUB_OUTPUT; if not certified, comments the reasons
//                    on the PR and labels it `needs-human`.
//   merge          — squash-merge the PR and leave the certification comment.
//   route <reason> — comment + label `needs-human` with a specific reason
//                    (used when the lint phase fails after rules pass).
//
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY (owner/repo), PR_NUMBER.
// Run from a checkout of the BASE branch (the workflow guarantees this).
// No dependencies. Node built-ins + global fetch only.

import { readFileSync, readdirSync, existsSync, statSync, appendFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [, , SUBCOMMAND, ...ARGS] = process.argv;

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY; // owner/repo
const PR_NUMBER = Number(process.env.PR_NUMBER);
if (!TOKEN || !REPO || !PR_NUMBER || !SUBCOMMAND) {
  console.error('usage: GITHUB_TOKEN=.. GITHUB_REPOSITORY=owner/repo PR_NUMBER=N node tools/witness.mjs <check|merge|route [reason]>');
  process.exit(2);
}

const API = `https://api.github.com/repos/${REPO}`;
const MARKER = '<!-- the-witness -->';

async function gh(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });
  if (!res.ok && init.tolerate !== true) {
    throw new Error(`${init.method || 'GET'} ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

// --- base-branch truth -----------------------------------------------------

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

function loadBindings() {
  // Pinned residents bind by immutable account ID (tools/github-ids.json);
  // unpinned ones fall back to the mutable `github:` login (lowercased) until
  // the town clock pins them. A pinned resident is deliberately NOT
  // login-matchable: their old login may have been abandoned and re-registered
  // by a stranger, and their ADDRESS `github:` string is display-only.
  const wp = join(ROOT, 'WHITE_PAGES');
  let pins = {};
  try {
    pins = JSON.parse(readFileSync(join(ROOT, 'tools', 'github-ids.json'), 'utf8'));
  } catch { /* no registry yet — every resident falls back to login */ }
  const byId = {};    // numeric account id -> [handles]
  const byLogin = {}; // login (lowercased) -> [handles]
  for (const d of readdirSync(wp)) {
    if (d === 'TEMPLATE') continue;
    const ap = join(wp, d, 'ADDRESS.md');
    try {
      if (!statSync(join(wp, d)).isDirectory() || !existsSync(ap)) continue;
    } catch { continue; }
    if (typeof pins[d]?.id === 'number') {
      (byId[pins[d].id] ||= []).push(d);
      continue;
    }
    const fm = frontmatter(readFileSync(ap, 'utf8').replace(/\r/g, ''));
    const login = (fm.github || '').replace(/^@/, '').toLowerCase();
    if (!login) continue;
    (byLogin[login] ||= []).push(d);
  }
  return { byId, byLogin };
}

function loadFounderRoster() {
  const p = join(ROOT, 'PROJECTS', 'build-the-town', 'atlas', 'placements.json');
  try {
    const j = JSON.parse(readFileSync(p, 'utf8'));
    return Array.isArray(j.founder_households) ? j.founder_households : [];
  } catch {
    return [];
  }
}

function householdOf(handle, roster) {
  return roster.find((members) => members.includes(handle)) || null;
}

function householdAlreadyFounded(household) {
  return household.some((m) => existsSync(join(ROOT, 'WHITE_PAGES', m, 'HOME', 'REGION.md')));
}

// --- PR reading ------------------------------------------------------------

async function prFiles() {
  const files = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`/pulls/${PR_NUMBER}/files?per_page=100&page=${page}`);
    files.push(...batch);
    if (batch.length < 100) break;
  }
  return files;
}

const OK_EXT = /\.(md|txt|png|jpg|jpeg|webp|gif)$/i;

async function evaluate() {
  const pr = await gh(`/pulls/${PR_NUMBER}`);
  const author = (pr.user?.login || '').toLowerCase();
  const authorId = pr.user?.id;
  const reasons = [];

  const { byId, byLogin } = loadBindings();
  const handles = [...new Set([...(byId[authorId] || []), ...(byLogin[author] || [])])];
  if (!handles.length) {
    reasons.push(
      `no resident ADDRESS.md binds the GitHub account \`${pr.user?.login}\` (a join, a first PR, or an unbound account — a human will read it; joins always get human eyes, and that's a welcome, not a queue).`
    );
  }

  const roster = loadFounderRoster();
  const files = await prFiles();
  if (!files.length) reasons.push('the PR changes no files.');

  for (const f of files) {
    const p = f.filename;
    if (f.status === 'removed') { reasons.push(`deletes \`${p}\` — removals get human eyes.`); continue; }
    if (f.status === 'renamed') { reasons.push(`renames \`${f.previous_filename}\` — renames get human eyes.`); continue; }
    const m = p.match(/^WHITE_PAGES\/([^/]+)\//);
    if (!m || !handles.includes(m[1])) {
      reasons.push(`touches \`${p}\`, outside your own pages (\`WHITE_PAGES/${handles.join('|') || '<you>'}/\`).`);
      continue;
    }
    if (/\/inbox\//.test(p)) {
      reasons.push(`touches \`${p}\` — inboxes are the ferry's writing surface (received mail stays as delivered).`);
      continue;
    }
    if (!OK_EXT.test(p) && !/\.gitkeep$/.test(p)) {
      reasons.push(`adds \`${p}\` — the witness only certifies prose and pictures (.md, .txt, images); anything else gets human eyes.`);
      continue;
    }
    if (f.status === 'added' && /^WHITE_PAGES\/[^/]+\/HOME\/REGION\.md$/.test(p)) {
      const handle = m[1];
      const household = householdOf(handle, roster);
      if (!household) {
        reasons.push(`founds a region (\`${p}\`) from a handle not on the founder roster — region-founding is the founder households' thank-you (PROJECTS/build-the-town/the-regions.md); a human will read it.`);
      } else if (householdAlreadyFounded(household)) {
        reasons.push(`founds a second region (\`${p}\`) — one region per household; a human will read it.`);
      }
    }
  }

  return { pr, certified: reasons.length === 0, reasons: [...new Set(reasons)], handles };
}

// --- PR writing ------------------------------------------------------------

async function upsertComment(body) {
  const comments = await gh(`/issues/${PR_NUMBER}/comments?per_page=100`);
  const mine = (comments || []).find((c) => c.body && c.body.includes(MARKER));
  if (mine) {
    await gh(`/issues/comments/${mine.id}`, { method: 'PATCH', body: JSON.stringify({ body }) });
  } else {
    await gh(`/issues/${PR_NUMBER}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  }
}

async function label(name) {
  await gh(`/issues/${PR_NUMBER}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels: [name] }),
    tolerate: true, // a missing-permission or existing label shouldn't fail the run
  });
}

function setOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

async function routeToHumans(reasons) {
  const body = [
    MARKER,
    `**The witness read this PR and is handing it to a human** — not a rejection, just outside what the town certifies mechanically:`,
    '',
    ...reasons.map((r) => `- ${r}`),
    '',
    `*Self-scoped PRs (only your own \`WHITE_PAGES/<you>/\` pages — letters, your HOME/, your address) merge on their own. Mixing anything else in routes the whole PR here. See CONTRIBUTING.md § One PR, one thing.*`,
  ].join('\n');
  await upsertComment(body);
  await label('needs-human');
}

// --- subcommands -------------------------------------------------------------

if (SUBCOMMAND === 'check') {
  const { certified, reasons } = await evaluate();
  setOutput('certified', String(certified));
  if (certified) {
    console.log('witness: certified — every changed file is inside the author’s own pages.');
  } else {
    console.log('witness: routed to humans —');
    for (const r of reasons) console.log(`  - ${r}`);
    await routeToHumans(reasons);
  }
} else if (SUBCOMMAND === 'merge') {
  const { certified, reasons, pr } = await evaluate(); // re-check at merge time — the PR may have grown since
  if (!certified) {
    await routeToHumans(reasons);
    console.error('witness: refused to merge — certification no longer holds.');
    process.exit(1);
  }
  // Merge first, comment after — a comment that says "Merged." must not land
  // on a PR the merge then fails to close. And the base branch can move
  // between certification and this call (the town clock commits on schedule;
  // other PRs land) — GitHub refuses that race with 405 "Base branch was
  // modified", which is an optimistic-lock retry hint, not a verdict. Retry
  // with backoff; if it still won't land, route to humans so the certified PR
  // carries a label instead of stranding silently in a red run.
  let mergeError = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await gh(`/pulls/${PR_NUMBER}/merge`, {
        method: 'PUT',
        body: JSON.stringify({ merge_method: 'squash' }),
      });
      mergeError = null;
      break;
    } catch (e) {
      mergeError = e;
      if (!String(e.message).includes('Base branch was modified')) break;
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
  if (mergeError) {
    await routeToHumans([
      `certification held, but the merge itself failed (${String(mergeError.message).slice(0, 160)}) — nothing wrong with the PR; a maintainer or a workflow re-run can land it.`,
    ]);
    console.error('witness: certified but the merge failed — routed to humans.');
    process.exit(1);
  }
  await upsertComment(
    [
      MARKER,
      `**Certified by the witness** — every changed file is inside \`WHITE_PAGES/\` ground this account owns, nothing deleted, nothing but prose and pictures, lint clean. Merged.`,
      '',
      `*The town's one-door rule holds: this PR was read — by the witness, whose whole judgment is the diff. Anything it can't prove goes to human eyes instead.*`,
    ].join('\n')
  );
  console.log('witness: merged.');
} else if (SUBCOMMAND === 'route') {
  await routeToHumans([ARGS.join(' ') || 'the certification pipeline hit an unexpected state.']);
  console.log('witness: routed to humans.');
} else {
  console.error(`unknown subcommand: ${SUBCOMMAND}`);
  process.exit(2);
}
