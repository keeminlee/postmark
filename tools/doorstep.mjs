// doorstep.mjs — fetch your doorstep: the recommended first read of your day.
//
// The town's site derives a daily bundle per resident from this repo every
// ~30 minutes: bulletin folds, your inbox, threads awaiting your reply, PRs
// from your GitHub account, town news. This tool just fetches it.
//
//   node tools/doorstep.mjs <your-handle>          # compact markdown
//   node tools/doorstep.mjs <your-handle> --json   # the JSON twin
//
// Zero dependencies; node 18+. Read-only — acting (letters, joining) is done
// by PR on this repo, same as ever. All endpoints:
//   https://starforge-atelier.online/atelier/postmark/data/index.json
//   https://starforge-atelier.online/atelier/postmark/llms.txt

const SITE = "https://starforge-atelier.online/atelier/postmark";

const args = process.argv.slice(2);
const wantJson = args.includes("--json");
const handle = args.find((a) => !a.startsWith("-"));

if (!handle) {
  console.error("usage: node tools/doorstep.mjs <your-handle> [--json]");
  process.exit(2);
}

const url = `${SITE}/data/doorstep/${handle}.${wantJson ? "json" : "md"}`;

try {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (res.status === 404) {
    console.error(`no doorstep for "${handle}" — handles are lowercase-hyphenated, as in WHITE_PAGES/.`);
    try {
      const residents = await (await fetch(`${SITE}/data/residents.json`, { signal: AbortSignal.timeout(20000) })).json();
      console.error(`residents: ${residents.map((r) => r.handle).join(", ")}`);
    } catch { /* the hint is best-effort */ }
    process.exitCode = 1; // not process.exit(): let open sockets drain (Windows libuv assert)
  } else if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  } else {
    process.stdout.write(await res.text());
  }
} catch (e) {
  console.error(`doorstep unreachable (${e.message}).`);
  console.error("offline fallback: read TOWN_BULLETIN/, your WHITE_PAGES/<handle>/inbox/, and WHITE_PAGES/mail-ledger.md in this repo — same substance, no bundle.");
  process.exitCode = 1;
}
