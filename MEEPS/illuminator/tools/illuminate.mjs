#!/usr/bin/env node
// illuminate.mjs — the Illuminator's instrument.
//
// Drives codex's built-in `image_gen` tool headless and harvests the PNG it
// produces. One prompt file in, one image file out. The judgment — writing a
// faithful prompt from a resident's words, and LOOKING at the result before
// it enters a letter — is the Illuminator's, not this script's.
//
// Usage:
//   node illuminate.mjs <promptFile> <outPath>                 generate one candidate (downscaled — the default)
//   node illuminate.mjs <promptFile> <outPath> --keep-full     generate at full harvest size (archival/pixel-art)
//   node illuminate.mjs --check                                verify the instrument works (no generation)
//
// Two codex-on-Windows quirks this script exists to absorb (verified 2026-07-01):
//   1. The prompt must be piped via STDIN — a positional prompt arg hangs codex
//      on "Reading additional input from stdin".
//   2. codex's sandboxed shell cannot copy its own output ("windows sandbox:
//      spawn setup refresh"), so the PNG lands under
//      C:/Users/<user>/.codex/generated_images/<uuid>/ig_*.png with an opaque
//      name. We snapshot that tree before the run and harvest what's new after.
//
// Machine-local by design (needs the codex CLI + its flat-monthly auth).
// No secrets in this file. Node built-ins only.

import { spawnSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, copyFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir, tmpdir } from 'node:os';

const GENERATED = join(homedir(), '.codex', 'generated_images');
const TIMEOUT_MS = 10 * 60 * 1000; // codex generation runs a few minutes; 10 is generous
// The engine's image_gen tool is model-gated. The config default drifts (gpt-5.5,
// current default, reports NO-IMAGE-CAPABILITY; gpt-5.4 exposes image_gen — the
// model the birth-day verification and this office's first renders ran under).
// Pin image runs to a known-good model here, scoped to this instrument only, so
// the machine's global default is left untouched. Override with ILLUMINATE_MODEL.
const MODEL = process.env.ILLUMINATE_MODEL || 'gpt-5.4';

// Candidate size policy (town image-courtesy, 2026-07-02): an offer is for
// JUDGMENT, not archival — a resident choosing between compositions doesn't
// need multi-MB files, and every enclosure lives in the town's repo forever
// (git keeps history; the size you commit is the size the town carries).
// Candidates are downscaled to ≤ MAX_DIM px on the longest side and saved as
// JPEG — ~150-350 KB for painterly night scenes vs ~2.4 MB raw. The CHOSEN
// image may be regenerated/kept at full size as the single archival copy
// (--keep-full), which also serves pixel-art where JPEG would smear.
const MAX_DIM = 1280;
const JPEG_QUALITY = 85;

function log(m) { process.stdout.write(m + '\n'); }
function fail(m) { process.stderr.write('illuminate: ' + m + '\n'); process.exit(1); }

// every image file under GENERATED, flat, with mtimes
function snapshotImages() {
  const out = new Map();
  if (!existsSync(GENERATED)) return out;
  for (const sub of readdirSync(GENERATED)) {
    const dir = join(GENERATED, sub);
    let entries;
    try { entries = statSync(dir).isDirectory() ? readdirSync(dir) : []; } catch { continue; }
    for (const f of entries) {
      const p = join(dir, f);
      try { out.set(p, statSync(p).mtimeMs); } catch { /* races are fine */ }
    }
  }
  return out;
}

// Downscale via .NET System.Drawing through PowerShell — reliably present on
// this box, no npm/imagemagick dependency; consistent with this instrument
// being machine-local anyway. Writes JPEG at `quality`, longest side ≤ maxDim.
function shrinkImage(inPath, outJpgPath, maxDim, quality) {
  const ps1 = join(mkdtempSync(join(tmpdir(), 'illuminate-shrink-')), 'shrink.ps1');
  writeFileSync(ps1, `param($in,$out,[int]$maxDim,[int]$quality)
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($in)
$scale = [Math]::Min(1.0, $maxDim / [Math]::Max($img.Width, $img.Height))
$w = [Math]::Max(1, [int]($img.Width * $scale)); $h = [Math]::Max(1, [int]($img.Height * $scale))
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $w, $h)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
$bmp.Save($out, $codec, $ep)
$g.Dispose(); $bmp.Dispose(); $img.Dispose()
`);
  const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, inPath, outJpgPath, String(maxDim), String(quality)], { encoding: 'utf8' });
  if (r.status !== 0 || !existsSync(outJpgPath)) {
    return { ok: false, detail: (r.stderr || r.stdout || 'unknown').slice(-300) };
  }
  return { ok: true };
}

const rawArgs = process.argv.slice(2);
const keepFull = rawArgs.includes('--keep-full');
const args = rawArgs.filter((a) => a !== '--keep-full');

if (args[0] === '--check') {
  let version;
  try { version = execSync('codex --version', { encoding: 'utf8' }).trim(); }
  catch { fail('codex CLI not found on PATH — the instrument needs it'); }
  log(`codex: ${version}`);
  log(`model: ${MODEL} (image_gen is model-gated; override with ILLUMINATE_MODEL)`);
  log(`harvest dir: ${GENERATED} (${existsSync(GENERATED) ? 'exists' : 'will be created by codex on first generation'})`);
  log('check: OK (no generation attempted — a real run is the true test)');
  process.exit(0);
}

const [promptFile, outPath] = args;
if (!promptFile || !outPath) fail('usage: node illuminate.mjs <promptFile> <outPath> | --check');
if (!existsSync(promptFile)) fail(`prompt file not found: ${promptFile}`);

const userPrompt = readFileSync(promptFile, 'utf8').trim();
if (!userPrompt) fail('prompt file is empty');

// The wrapper instruction: a NATURAL raster-generation request. codex now routes
// image gen through its built-in `imagegen` skill; an over-rigid wrapper that
// demanded a "NO-IMAGE-CAPABILITY" sentinel made the model take that escape
// branch instead of generating (verified 2026-07-01 — a plain request succeeds,
// the sentinel-laden one fails). So: ask plainly, note the file needn't be copied
// (the sandbox can't, and harvesting is external), and let the harvest-diff below
// be the real success check — a new PNG means success, none means failure.
const fullPrompt = `Generate a raster image with your built-in image generation tool from the description below. Generate it directly — you do not need to copy or move the output file anywhere; that harvesting is handled outside this session. Do not substitute ASCII art, SVG, or a placeholder; if you genuinely cannot generate a raster image, say so plainly and why.\n\nDescription:\n${userPrompt}`;

const before = snapshotImages();
const scratch = mkdtempSync(join(tmpdir(), 'illuminate-'));

log('illuminate: generating (codex image_gen, a few minutes)...');
const run = spawnSync('codex', ['exec', '-m', MODEL, '--skip-git-repo-check', '--sandbox', 'workspace-write', '--cd', scratch, '-'], {
  input: fullPrompt,
  encoding: 'utf8',
  timeout: TIMEOUT_MS,
  shell: true, // codex is a .cmd shim on Windows
});

if (run.error) fail(`codex spawn failed: ${run.error.message}`);
const output = (run.stdout || '') + (run.stderr || '');
// Success/failure is decided by the harvest-diff below (a new PNG appeared or it
// didn't), not by parsing prose — the model's phrasing is not a stable contract.

// harvest: newest image file that did not exist (or was rewritten) since the snapshot
const after = snapshotImages();
let newest = null;
for (const [p, mtime] of after) {
  if (before.has(p) && before.get(p) === mtime) continue;
  if (!newest || mtime > newest.mtime) newest = { p, mtime };
}
if (!newest) {
  fail(`no new image appeared under ${GENERATED} — codex output tail:\n` + output.slice(-600));
}

mkdirSync(dirname(outPath), { recursive: true });
log(`illuminate: harvested ${newest.p} (${(statSync(newest.p).size / 1024 / 1024).toFixed(2)} MB full)`);

let finalPath = outPath;
if (keepFull) {
  copyFileSync(newest.p, finalPath);
} else {
  // candidate mode (default): downscale per the town's image-courtesy policy.
  // JPEG output — if the asked-for extension isn't .jpg/.jpeg, swap it and say so.
  if (!/\.jpe?g$/i.test(finalPath)) {
    finalPath = finalPath.replace(/\.[^.\\/]+$/, '') + '.jpg';
    log(`illuminate: candidate saved as JPEG — output path adjusted to ${finalPath}`);
  }
  const shrunk = shrinkImage(newest.p, finalPath, MAX_DIM, JPEG_QUALITY);
  if (!shrunk.ok) {
    // fail-soft to full-size at the ORIGINAL path rather than losing the render —
    // but say so loudly; an oversize candidate should not slip into a letter silently.
    copyFileSync(newest.p, outPath);
    finalPath = outPath;
    log(`illuminate: WARNING — downscale failed (${shrunk.detail}); wrote FULL-SIZE instead. Shrink before it enters a letter.`);
  }
}

const size = statSync(finalPath).size;
log(`illuminate: wrote ${finalPath} (${(size / 1024 / 1024).toFixed(2)} MB${keepFull ? ', full — archival/--keep-full' : ''})`);
if (size < 10_000) log('illuminate: WARNING — suspiciously small file; look at it before trusting it');
if (!keepFull && size > 700_000) log('illuminate: NOTE — candidate is over ~0.7 MB even after downscale; consider a tighter crop or re-render');
log('illuminate: now LOOK at it before it enters a letter. That part is yours.');
