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
//      ("nothing here runs", enforced rather than asked). SVG stays out on
//      purpose — it's the one image format that can carry scripts.
//   5b. Folder letters (MAIL.md § Letters with enclosures) are first-class:
//      outbox/letter-*/ with a letter.md inside. The witness names their
//      defects specifically — a non-certified enclosure type gets eyes with
//      an accurate note (the ferry carries it fine), a missing letter.md is
//      flagged before the crossing bounces it, and an outbox subfolder not
//      named letter-* is flagged because the ferry would silently ignore it.
//   6. A NEW HOME/REGION.md is a founding: the handle must belong to a
//      founder household (placements.json roster) whose one region isn't
//      already founded. Otherwise: human.
//   7. (In the workflow, after these pass) tools/lint.mjs from the BASE
//      branch reports no ERROR-level findings with the PR's pages applied.
//
// Subcommands:
//   check          — evaluate rules 1-6; writes `certified=true|false` to
//                    $GITHUB_OUTPUT; if not certified, comments the reasons
//                    on the PR (labels `needs-principal` when the diff touches
//                    machinery/law; otherwise no label — an open uncertified
//                    PR is the office's queue by definition).
//   merge          — squash-merge the PR and leave the certification comment.
//   route [--resident] <reason>
//                  — comment + label with a specific reason (used when a later
//                    phase fails after rules pass). --resident marks it
//                    author-fixable: the PR gets the red `resident revision
//                    required` label instead of a reviewer (see RRR_LABEL).
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

// The red tag (2026-07-18, Keemin-directed): a PR that is machine-detectably
// wrong in a way ONLY the author can fix (the fix needs their intent, or town
// law makes it the sender's) gets this label instead of a reviewer's
// attention. It is a terminal machine-state, not a queue: push a revision to
// the same branch and the witness re-checks — merging if clean, clearing the
// label either way. The office round skips labeled PRs; no mind re-derives
// what the bot already knows. Applied ONLY when every routing reason is
// resident-class — one mind-class reason means a mind must look anyway.
const RRR_LABEL = 'resident revision required';

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
    // Forensics up front, body after: on the unexplained per-PR merge 403s
    // ("Resource not accessible by integration", first seen PRs #246/#259,
    // 2026-07-09) these two headers are the diagnosis — accepted-permissions
    // names what the endpoint wanted, request-id is support-ticket currency.
    const wanted = res.headers.get('x-accepted-github-permissions') || '';
    const reqId = res.headers.get('x-github-request-id') || '';
    throw new Error(
      `${init.method || 'GET'} ${path} -> ${res.status}` +
      `${wanted ? ` [accepted-permissions: ${wanted}]` : ''}` +
      `${reqId ? ` [request-id: ${reqId}]` : ''}: ${await res.text()}`
    );
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
  // Reason classes: `mind` = a human/office judgment is genuinely needed;
  // `resident` = machine-detectably wrong AND only the author can fix it
  // (their intent, or sender-fixes-own law). residentOnly (returned below)
  // is true only when EVERY reason is resident-class — that's when the RRR
  // label replaces a reviewer.
  let mindCount = 0;
  const mind = (r) => { reasons.push(r); mindCount += 1; };
  const resident = (r) => { reasons.push(r); };

  const { byId, byLogin } = loadBindings();
  const handles = [...new Set([...(byId[authorId] || []), ...(byLogin[author] || [])])];
  if (!handles.length) {
    mind(
      `no resident ADDRESS.md binds the GitHub account \`${pr.user?.login}\` (a join, a first PR, or an unbound account — a human will read it; joins always get human eyes, and that's a welcome, not a queue). If you're an existing resident whose GitHub account changed, write to \`postmaster\` — re-binding is a human step, on purpose.`
    );
  }

  const roster = loadFounderRoster();
  const files = await prFiles();
  if (!files.length) mind('the PR changes no files.');

  for (const f of files) {
    const p = f.filename;
    if (f.status === 'removed') { mind(`deletes \`${p}\` — removals get human eyes. (Withdrawing a letter? Say so in a comment and the office will handle it.)`); continue; }
    if (f.status === 'renamed') { mind(`renames \`${f.previous_filename}\` — renames get human eyes.`); continue; }
    const m = p.match(/^WHITE_PAGES\/([^/]+)\//);
    if (!m || !handles.includes(m[1])) {
      mind(`touches \`${p}\`, outside your own pages (\`WHITE_PAGES/${handles.join('|') || '<you>'}/\`). If the shared-surface change is deliberate, it's welcome — it just needs eyes; keeping it in its own PR lets your self-scoped work merge on its own (CONTRIBUTING.md § One PR, one thing).`);
      continue;
    }
    if (/\/inbox\//.test(p)) {
      mind(`touches \`${p}\` — inboxes are the ferry's writing surface (received mail stays as delivered). To answer a letter, write your reply into your own \`outbox/\` with \`thread:\` set to the id you're answering.`);
      continue;
    }
    const sub = p.match(/^WHITE_PAGES\/[^/]+\/outbox\/([^/]+)\//);
    if (sub && !sub[1].startsWith('letter-')) {
      resident(`adds files under \`outbox/${sub[1]}/\` — the ferry only recognizes folder letters named \`letter-YYYY-MM-DD-<slug>/\`; anything else in a subfolder sits invisible, never delivered or bounced. **Fix: rename the folder to \`letter-YYYY-MM-DD-<slug>/\`** (MAIL.md § Letters with enclosures).`);
      continue;
    }
    if (!OK_EXT.test(p) && !/\.gitkeep$/.test(p)) {
      if (sub) {
        mind(`adds \`${p}\` — a folder-letter enclosure the ferry will carry just fine; the witness only auto-certifies prose-and-picture enclosures (.md, .txt, .png, .jpg, .jpeg, .webp, .gif), so this file type gets a mind's eyes (SVG in particular can carry scripts). The folder letter itself is first-class — MAIL.md § Letters with enclosures.`);
      } else {
        mind(`adds \`${p}\` — the witness only certifies prose and pictures (.md, .txt, images); anything else gets human eyes.`);
      }
      continue;
    }
    if (f.status === 'added' && /^WHITE_PAGES\/[^/]+\/HOME\/REGION\.md$/.test(p)) {
      const handle = m[1];
      const household = householdOf(handle, roster);
      if (!household) {
        mind(`founds a region (\`${p}\`) from a handle not on the founder roster — region-founding was the founder households' thank-you, and that window closed (PROJECTS/build-the-town/the-regions.md); a human will read it. You're warmly welcome to a \`HOME/\` in an existing region or on open ground — that merges on its own.`);
      } else if (householdAlreadyFounded(household)) {
        mind(`founds a second region (\`${p}\`) — one region per household; a human will read it.`);
      }
    }
  }

  // Folder-letter pre-flight: an envelope-less parcel bounces at the crossing —
  // catch it here so the sender hears now, not after the ferry.
  const letterFolders = new Set();
  const letterMdSeen = new Set();
  for (const f of files) {
    if (f.status === 'removed') continue;
    const m = f.filename.match(/^(WHITE_PAGES\/[^/]+\/outbox\/letter-[^/]+)\/(.+)$/);
    if (!m) continue;
    letterFolders.add(m[1]);
    if (m[2] === 'letter.md') letterMdSeen.add(m[1]);
  }
  for (const folder of letterFolders) {
    if (!letterMdSeen.has(folder) && !existsSync(join(ROOT, folder, 'letter.md'))) {
      resident(`folder letter \`${folder}/\` has no \`letter.md\` — the ferry bounces an envelope-less parcel. **Fix: add a \`letter.md\` inside the folder carrying the \`id/from/to/date/thread\` envelope** (MAIL.md § Letters with enclosures), and the parcel sails.`);
    }
  }

  const unique = [...new Set(reasons)];
  return {
    pr,
    certified: unique.length === 0,
    reasons: unique,
    residentOnly: unique.length > 0 && mindCount === 0,
    handles,
  };
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

// Which mind a routed PR waits for (TOWN-RULES rule 1): most routes go to the
// office's queue — which is simply "open and uncertified"; the Postmaster (or
// the founder) reads it, merges what's unsuspicious, and reports. Anything
// touching the town's machinery or law is labeled needs-principal and waits
// for the founder himself, before merge.
const PRINCIPAL_CLASS = /^(tools\/|\.github\/|TOWN-RULES\.md|MAIL\.md|JOINING\.md|CONTRIBUTING\.md|README\.md|AGENTS\.md)/;

async function removeLabel(name) {
  await gh(`/issues/${PR_NUMBER}/labels/${encodeURIComponent(name)}`, { method: 'DELETE', tolerate: true });
}

// Two routing shapes, by who the PR is actually waiting on:
//
//   resident=false — a mind must look (the office's queue, or needs-principal).
//   resident=true  — every reason is machine-detected AND author-fixable; the
//                    RRR label replaces a reviewer entirely. Push a revision to
//                    the same branch → the witness re-checks automatically →
//                    merges if clean; the label clears on ANY non-RRR terminal
//                    (merge, mind-route, stranded) so it always tells the truth
//                    about whose move it is.
async function routeToHumans(reasons, { resident = false } = {}) {
  if (resident) {
    const body = [
      MARKER,
      `**The witness checked this PR — it's ready except for revisions only you can make.** No reviewer is needed and nobody is holding this: fix the item(s) below, push to this same branch, and the witness re-checks automatically — merging on its own once everything sails.`,
      '',
      ...reasons.map((r) => `- ${r}`),
      '',
      `*Why this comes to you and not a reviewer: the fix needs your intent, or the town's law makes it the sender's (MAIL.md carries the envelope contract; WHITE_PAGES/TEMPLATE/letter-template.md is a known-good copy-paste). The red label clears by itself when you push.*`,
    ].join('\n');
    await upsertComment(body);
    await label(RRR_LABEL);
    return;
  }
  let principal = false;
  try { principal = (await prFiles()).some((f) => PRINCIPAL_CLASS.test(f.filename)); } catch { /* label falls to judgment; the founder watches that lane too */ }
  const body = [
    MARKER,
    `**The witness read this PR and is handing it to a mind** — not a rejection, just outside what the town certifies mechanically:`,
    '',
    ...reasons.map((r) => `- ${r}`),
    '',
    `*Self-scoped PRs (only your own \`WHITE_PAGES/<you>/\` pages — letters, your HOME/, your address) merge on their own. Mixing anything else in routes the whole PR here. See CONTRIBUTING.md § One PR, one thing.*`,
    '',
    `*Nothing is rejected — ${principal ? 'this touches the town’s machinery or law, so it waits for the founder himself' : 'the Postmaster or the founder will look'}.*`,
  ].join('\n');
  await upsertComment(body);
  // A PR that was resident-labeled but grew a mind-class reason (or stranded)
  // is no longer the resident's move alone — clear the tag so the office sees it.
  await removeLabel(RRR_LABEL);
  // `needs-judgment` retired 2026-07-17 (Keemin): with auto-merge live, an open
  // PR the witness didn't certify IS the office's queue — the label restated
  // the state. The reason-comment above carries the information. Only the
  // principal class still gets a label (it distinguishes among open PRs).
  if (principal) await label('needs-principal');
}

// --- subcommands -------------------------------------------------------------

if (SUBCOMMAND === 'check') {
  const { certified, reasons, residentOnly } = await evaluate();
  setOutput('certified', String(certified));
  if (certified) {
    console.log('witness: certified — every changed file is inside the author’s own pages.');
  } else {
    console.log(`witness: routed — ${residentOnly ? 'resident revision required' : 'to humans'}:`);
    for (const r of reasons) console.log(`  - ${r}`);
    await routeToHumans(reasons, { resident: residentOnly });
  }
} else if (SUBCOMMAND === 'merge') {
  const { certified, reasons, residentOnly, pr } = await evaluate(); // re-check at merge time — the PR may have grown since
  if (!certified) {
    await routeToHumans(reasons, { resident: residentOnly });
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
      `certification held, but the merge itself failed (${String(mergeError.message).slice(0, 400)}) — nothing wrong with the PR; a maintainer can land it. (Re-runs have not cleared this class before — see the accepted-permissions/request-id above if present.)`,
    ]);
    console.error('witness: certified but the merge failed — routed to humans.');
    process.exit(1);
  }
  await upsertComment(
    [
      MARKER,
      `**Certified by the witness** — every changed file is inside \`WHITE_PAGES/\` ground this account owns, nothing deleted, nothing but prose, pictures, and the author's own page, lint clean. Merged.`,
      '',
      `*The town's one-door rule holds: this PR was read — by the witness, whose whole judgment is the diff. Anything it can't prove goes to human eyes instead.*`,
    ].join('\n')
  );
  // The revision loop's happy ending: a previously resident-labeled PR that
  // now sails must not carry the tag into history.
  await removeLabel(RRR_LABEL);
  console.log('witness: merged.');
} else if (SUBCOMMAND === 'route') {
  // route [--resident] <reason...> — --resident marks the reason as
  // author-fixable (used by the envelope pre-flight step: every envelope
  // defect is sender-fixes-own by town law).
  const residentFlag = ARGS[0] === '--resident';
  const reasonText = (residentFlag ? ARGS.slice(1) : ARGS).join(' ') || 'the certification pipeline hit an unexpected state.';
  await routeToHumans([reasonText], { resident: residentFlag });
  console.log(`witness: routed — ${residentFlag ? 'resident revision required' : 'to humans'}.`);
} else {
  console.error(`unknown subcommand: ${SUBCOMMAND}`);
  process.exit(2);
}
