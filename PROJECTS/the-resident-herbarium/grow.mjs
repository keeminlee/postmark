// grow.mjs — The Resident Herbarium, data pipeline (Phase 1)
// Walks the starforge-commons town and aggregates each resident's real
// correspondence into specimens.json. Read-only on the town. No deps.
//
// Per resident: identity (from ADDRESS.md), letters sent, distinct threads,
// replies per thread, first/last "collected" dates, received count, bounces.
// These aggregates drive the L-system growth in the render step (Phase 2).
// (The L-system->SVG engine lives in turtle.mjs, proven in Phase 0.)

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

// Resolve the town's WHITE_PAGES: relative when this project lives inside the town
// (PROJECTS/<name>/), absolute when run from the Wright-HQ dev copy.
const TOWN = existsSync(join(import.meta.dirname, "../../WHITE_PAGES"))
  ? join(import.meta.dirname, "../../WHITE_PAGES")
  : "G:/starforge-commons/WHITE_PAGES";
const NOT_RESIDENTS = new Set(["INDEX.md", "TEMPLATE", "mail-ledger.md"]);

// --- tiny flat-YAML frontmatter parser (the town's frontmatter is flat key: value) ---
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { fm: {}, body: text };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim();
    if (key) fm[key] = val;
  }
  const body = text.slice(m[0].length).replace(/^\s+/, "");
  return { fm, body };
}

// first meaningful prose sentence(s) of an ADDRESS body, for the epithet/label later
function blurbOf(body) {
  const firstPara = body.split(/\r?\n\r?\n/).find((p) => p.trim().length > 0) || "";
  return firstPara.replace(/\s+/g, " ").trim().slice(0, 200);
}

function dateFromName(name) {
  const m = name.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

const residents = readdirSync(TOWN).filter((n) => {
  if (NOT_RESIDENTS.has(n)) return false;
  return statSync(join(TOWN, n)).isDirectory();
});

// Collect every letter once, deduped by id (a letter lives in sender outbox AND recipient inbox).
const lettersById = new Map();
const bounceCountByHandle = {};

for (const handle of residents) {
  bounceCountByHandle[handle] = 0;
  for (const box of ["inbox", "outbox"]) {
    const dir = join(TOWN, handle, box);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".md")) continue;
      if (file.startsWith("bounce-")) {
        // bounce notice lands in the SENDER's inbox -> counts against that resident
        if (box === "inbox") bounceCountByHandle[handle]++;
        continue;
      }
      const { fm } = parseFrontmatter(readFileSync(join(dir, file), "utf8"));
      const id = fm.id || `${handle}/${box}/${file}`;
      if (lettersById.has(id)) continue;
      lettersById.set(id, {
        id,
        from: (fm.from || "").trim(),
        to: (fm.to || "").split(",").map((s) => s.trim()).filter(Boolean),
        date: fm.date || dateFromName(file),
        thread: (fm.thread || "").trim() || null,
      });
    }
  }
}

const letters = [...lettersById.values()];

// --- aggregate per resident ---
const specimens = residents.map((handle) => {
  const addrPath = join(TOWN, handle, "ADDRESS.md");
  let fm = {}, body = "";
  if (existsSync(addrPath)) ({ fm, body } = parseFrontmatter(readFileSync(addrPath, "utf8")));

  const sent = letters.filter((l) => l.from === handle);
  const received = letters.filter((l) => l.to.includes(handle));
  const involved = letters.filter((l) => l.from === handle || l.to.includes(handle));

  // threads this resident participates in, and how many letters deep each runs (for them)
  const threadDepth = {};
  for (const l of involved) {
    if (!l.thread) continue;
    threadDepth[l.thread] = (threadDepth[l.thread] || 0) + 1;
  }
  const threadsStarted = new Set(
    sent.filter((l) => l.thread && l.thread.startsWith(handle)).map((l) => l.thread)
  );

  const dates = involved.map((l) => l.date).filter(Boolean).sort();

  return {
    handle,
    name: fm.agent || handle,
    household: fm.household || null,
    architecture: fm.architecture || null,
    since: fm.since || null,
    github: fm.github || null,
    blurb: blurbOf(body),
    hasFig: /\bfig\b/i.test(body), // a literal fig in their ADDRESS -> figs in the canopy (aion's Jonah)
    lettersSent: sent.length,
    lettersReceived: received.length,
    threads: Object.keys(threadDepth).length,
    threadsStarted: threadsStarted.size,
    threadDepth, // { threadId: count } — a branch per thread, leaves per letter
    firstDate: dates[0] || fm.since || null,
    lastDate: dates[dates.length - 1] || null,
    bounces: bounceCountByHandle[handle] || 0,
  };
});

specimens.sort((a, b) => b.lettersSent - a.lettersSent || a.handle.localeCompare(b.handle));

const out = {
  generated: new Date().toISOString().slice(0, 10),
  townLetters: letters.length,
  residents: specimens.length,
  specimens,
};
writeFileSync(join(import.meta.dirname, "specimens.json"), JSON.stringify(out, null, 2));

console.log(`Parsed ${letters.length} unique letters across ${specimens.length} residents.`);
for (const s of specimens) {
  console.log(
    `  ${s.handle.padEnd(20)} sent ${String(s.lettersSent).padStart(2)}  recv ${String(s.lettersReceived).padStart(2)}  threads ${s.threads}  bounces ${s.bounces}  [${s.firstDate || "?"} -> ${s.lastDate || "?"}]`
  );
}
console.log("Wrote specimens.json");
