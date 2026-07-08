// make-floor.mjs — compose the outside ground as one floor image: the atlas
// canvas (portrait) projected as a centered strip into the landscape room,
// zoomed out; tiled night grass, the river flowing down from the Peak,
// region washes with names, open-ground margins labeled honestly.
// Geometry: tools/geometry.mjs (single source). sharp borrowed from the
// site's node_modules (PoC-local hack).

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { WATER, REGIONS, project, scale, margins, VIEW_W, VIEW_H } from "./geometry.mjs";

const require = createRequire("G:/content-creation/starforge-site/package.json");
const sharp = require("sharp");

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

function smoothSegment(pts) {
  if (pts.length < 2) return `L${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} `;
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
    d += `Q${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)} `;
  }
  const last = pts[pts.length - 1];
  return d + `L${last.x.toFixed(1)},${last.y.toFixed(1)} `;
}
function ribbonPath(waypoints) {
  const left = [], right = [];
  for (let i = 0; i < waypoints.length; i++) {
    const p = waypoints[i];
    const prev = waypoints[Math.max(0, i - 1)];
    const next = waypoints[Math.min(waypoints.length - 1, i + 1)];
    let dx = next.x - prev.x, dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const nx = -dy, ny = dx, w = p.w / 2;
    left.push({ x: p.x + nx * w, y: p.y + ny * w });
    right.push({ x: p.x - nx * w, y: p.y - ny * w });
  }
  const r = right.slice().reverse();
  return `M${left[0].x.toFixed(1)},${left[0].y.toFixed(1)} ` +
    smoothSegment(left.slice(1)) + smoothSegment(r) + "Z";
}

// project waypoints/regions into the strip
const scaled = WATER.map((p) => {
  const { X, Y } = project(p.x, p.y);
  return { x: X, y: Y, w: p.w * scale };
});
const river = ribbonPath(scaled);
const riverCore = ribbonPath(scaled.map((p) => ({ ...p, w: p.w * 0.4 })));

const grassB64 = readFileSync(join(ROOT, "public", "sprites", "ground", "grass.png")).toString("base64");

const washes = REGIONS.map((r) => {
  const { X, Y } = project(r.cx, r.cy);
  const rx = r.rx * scale, ry = r.ry * scale;
  return `
  <ellipse cx="${X.toFixed(0)}" cy="${Y.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="${r.wash}" opacity="0.13"/>
  <text x="${X.toFixed(0)}" y="${(Y - ry - 5).toFixed(0)}" text-anchor="middle"
    font-family="Georgia, serif" font-style="italic" font-size="13" fill="#cfc6ad" opacity="0.75">${r.name}</text>`;
}).join("");

const seaTop = project(0, 1560).Y;
const stripL = margins.left, stripR = VIEW_W - margins.right;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEW_W}" height="${VIEW_H}">
  <defs>
    <pattern id="grass" width="48" height="48" patternUnits="userSpaceOnUse">
      <image href="data:image/png;base64,${grassB64}" width="48" height="48"/>
    </pattern>
    <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e3a52"/>
      <stop offset="100%" stop-color="#122943"/>
    </linearGradient>
  </defs>
  <rect width="${VIEW_W}" height="${VIEW_H}" fill="url(#grass)"/>
  <!-- open-ground margins: dimmed, labeled honestly (the atlas leaves them unclaimed) -->
  <rect x="0" y="0" width="${stripL.toFixed(0)}" height="${VIEW_H}" fill="#070a12" opacity="0.45"/>
  <rect x="${stripR.toFixed(0)}" y="0" width="${(VIEW_W - stripR).toFixed(0)}" height="${VIEW_H}" fill="#070a12" opacity="0.45"/>
  <text x="${(stripL / 2).toFixed(0)}" y="${(VIEW_H * 0.45).toFixed(0)}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="13" fill="#6b7590" transform="rotate(-90 ${(stripL / 2).toFixed(0)} ${(VIEW_H * 0.45).toFixed(0)})">the far bank — open ground, unclaimed</text>
  <text x="${(stripR + (VIEW_W - stripR) / 2).toFixed(0)}" y="${(VIEW_H * 0.45).toFixed(0)}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="13" fill="#6b7590" transform="rotate(90 ${(stripR + (VIEW_W - stripR) / 2).toFixed(0)} ${(VIEW_H * 0.45).toFixed(0)})">the country, and beyond — open ground</text>
  ${washes}
  <path d="${river}" fill="url(#waterGrad)"/>
  <path d="${river}" fill="none" stroke="#3d5f7a" stroke-width="1.5" opacity="0.6"/>
  <path d="${riverCore}" fill="none" stroke="#4d7192" stroke-width="2" opacity="0.35"/>
  <rect x="0" y="${seaTop.toFixed(0)}" width="${VIEW_W}" height="${(VIEW_H - seaTop).toFixed(0)}" fill="#0b1622" opacity="0.85"/>
  <text x="${VIEW_W / 2}" y="${(seaTop + (VIEW_H - seaTop) / 2 + 4).toFixed(0)}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="13" fill="#4d7192">the open sea</text>
</svg>`;

const out = join(ROOT, "public", "sprites", "ground", "outside-floor.png");
await sharp(Buffer.from(svg)).png().toFile(out);
console.log(`wrote ${out} (${VIEW_W}x${VIEW_H}, atlas-strip projection, river from the Peak, ${REGIONS.length} washes)`);
