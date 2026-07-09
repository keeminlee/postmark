// compile-world.mjs — derive the walkable town from the atlas.
//
// Reads the town's canonical town.json (the judgment ledger, executed) and
// the site's media map, and emits public/world.json — an npcts
// SpatialWorldConfig. Nothing here is invented: every room is a placed home,
// every plaque quotes the resident, every door follows the atlas's own
// bearings. Residents without a room.json (all of them, in this PoC) get a
// DEFAULT ROOM generated from their HOME — image on the wall, plaque, letter
// desk — so the walk is complete from day one.
//
// Deterministic: sorted inputs, no timestamps. Same discipline as
// extract-town.mjs. Usage: node tools/compile-world.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ATLAS_XY, CENTRE_XY, projectPct } from "./geometry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const TOWN_JSON = "G:/Wright-HQ/starforge-commons/PROJECTS/build-the-town/atlas/town.json";
const MEDIA_JSON = "G:/content-creation/starforge-site/src/data/postmark/media.json";
const SITE = "https://postmark.town";

const town = JSON.parse(readFileSync(TOWN_JSON, "utf8"));
const media = JSON.parse(readFileSync(MEDIA_JSON, "utf8"));

const homes = [...town.homes].sort((a, b) => a.id.localeCompare(b.id));
console.log(`compiling: ${homes.length} homes, ${town.regions.length} regions`);

// ── palette: the town at night ──────────────────────────────────────────────
const FLOORS = {
  "quayside":            "repeating-linear-gradient(45deg, #1a2030 0 14px, #171c2a 14px 28px)",
  "the-coast":           "repeating-linear-gradient(0deg, #14202b 0 18px, #121c26 18px 36px)",
  "the-mouth":           "repeating-linear-gradient(0deg, #16222d 0 18px, #131e28 18px 36px)",
  "downwater":           "repeating-linear-gradient(90deg, #17202e 0 20px, #141c29 20px 40px)",
  "upper-terrace":       "repeating-linear-gradient(45deg, #1e1f2e 0 16px, #1a1b29 16px 32px)",
  "descending-terraces": "repeating-linear-gradient(45deg, #1e1f2e 0 16px, #1a1b29 16px 32px)",
  "high-slope":          "repeating-linear-gradient(135deg, #1c2130 0 16px, #181d2b 16px 32px)",
  "lower-slope":         "repeating-linear-gradient(135deg, #1b2430 0 16px, #17202b 16px 32px)",
  "outskirts":           "repeating-linear-gradient(0deg, #181a24 0 22px, #14161f 22px 44px)",
};
const HUB_FLOOR = "repeating-conic-gradient(#1d2233 0% 25%, #191e2d 0% 50%)";
const HUB_FLOOR_SIZE = "28px 28px";

// ── shared room bones ───────────────────────────────────────────────────────
function walls() {
  return {
    topWall:    { orientation: "horizontal", x: 0,  y: 6,  width: 100, height: 5, style: "wood" },
    bottomWall: { orientation: "horizontal", x: 0,  y: 92, width: 100, height: 5, style: "wood" },
    leftWall:   { orientation: "vertical",   x: 0,  y: 6,  width: 2.5, height: 91, style: "wood" },
    rightWall:  { orientation: "vertical",   x: 97.5, y: 6, width: 2.5, height: 91, style: "wood" },
  };
}

// a resident's home image (first asset), as a site-processed card URL
function homeImage(h) {
  const asset = h.assets?.[0];
  return asset ? (media[asset]?.card ? SITE + media[asset].card : null) : null;
}

// ── the home rooms (default rooms — nobody's house is an empty lot) ────────
const rooms = {};
for (const h of homes) {
  const img = homeImage(h);
  const apps = {
    // the portrait: the resident's own home art on the far wall (or their title
    // as text). NB app width/height are percent OF THE WALL THICKNESS
    // (≈7% of viewport), not of the room — hence the large numbers.
    "the-portrait": {
      name: h.title,
      command: `open:${SITE}/residents/${h.resident}/`,
      x: 36, y: 12, width: 1800, height: 1100,
      ...(img ? { image: img } : { text: `✦ ${h.title} ✦` }),
    },
    // the plaque: who lives here + door to their page
    "the-plaque": {
      name: `${h.resident}${h.lit ? " · window lit" : ""}`,
      command: `open:${SITE}/residents/${h.resident}/`,
      x: 7, y: 24, width: 620, height: 200,
      text: `${h.resident}\n${h.band.replace(/-/g, " ")}${h.region ? ` · ${regionName(h.region)}` : ""}`,
    },
    // the letter desk: where the mail happens
    "the-letter-desk": {
      name: "the letter desk",
      command: `open:${SITE}/mail/`,
      x: 84, y: 24, width: 560, height: 190,
      text: "✉ letters",
    },
  };
  rooms[h.id] = {
    name: h.title,
    walls: walls(),
    doors: {
      "to-outside": {
        x: 46, y: 89, width: 8, height: 8,
        leadsTo: "the-town-outside", orientation: "down",
      },
    },
    applications: apps,
    floor_pattern: FLOORS[h.band] ?? FLOORS["quayside"],
  };
}

function regionName(id) {
  return town.regions.find((r) => r.id === id)?.region ?? id;
}

// ── the town outside: v0 open ground, houses placed by the atlas itself ─────
// bearing → direction from the square; band → distance out. Each house is a
// DOOR wearing its PixelLab sprite: walk into the house, be in the house.
import { existsSync } from "node:fs";
const DIR = {
  N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0],
  NE: [0.7, -0.7], NW: [-0.7, -0.7], SE: [0.7, 0.7], SW: [-0.7, 0.7], "-": [0, 0.4],
};
const RADIUS = {
  quayside: 13, "lower-slope": 19, "upper-terrace": 21, "descending-terraces": 26,
  "high-slope": 27, downwater: 27, "the-mouth": 33, "the-coast": 38, outskirts: 40,
};
// npcts doors snap to walls, so free-standing buildings are APPLICATIONS
// wearing their PixelLab sprites; walking up + interact fires `enter:<room>`,
// which the app's Teleporter bridges to navigation. App w/h are wall-thickness
// units (~0.21px/unit horizontally, ~0.56px/unit vertically at 1400x850).
//
// POSITIONS ARE THE ATLAS'S OWN, via tools/geometry.mjs (single source):
// the full portrait atlas canvas projected as a centered strip into the
// landscape room, zoomed out so the Peak at the river's head and both
// coasts fit on screen. Sizes are zoomed out with it.
const outsideBuildings = {};
for (const h of homes) {
  if (h.resident === "postmaster") continue; // the post office stands at the centre
  const at = ATLAS_XY[h.id];
  if (!at) { console.warn(`WARN no atlas position for ${h.id} — skipped outside (interior still reachable)`); continue; }
  const p = projectPct(at.x, at.y);
  const isPeak = h.id === "the-pando-peak";
  const w = isPeak ? 560 : 430, ht = isPeak ? 210 : 160; // wall-thickness units (~0.21 / ~0.56 px per unit)
  const x = Math.min(90, Math.max(1, p.x - 3.2));
  const y = Math.min(78, Math.max(4, p.y - 6));
  const sprite = `sprites/houses/${h.id}.png`;
  outsideBuildings[h.id] = {
    name: h.title,
    command: `enter:${h.id}`,
    x, y, width: w, height: ht,
    // placeholder-by-design when no sprite has been generated yet
    ...(existsSync(join(ROOT, "public", sprite)) ? { image: sprite } : { text: h.title }),
  };
}
// the Centre sits at the quay basin, the atlas's own anchor
const poP = projectPct(CENTRE_XY.x, CENTRE_XY.y);
const poSprite = "sprites/houses/the-post-office.png";
outsideBuildings["the-post-office"] = {
  name: "the post office",
  command: "enter:the-town-centre",
  x: poP.x - 4, y: poP.y - 7, width: 540, height: 200,
  ...(existsSync(join(ROOT, "public", poSprite)) ? { image: poSprite } : { text: "the post office" }),
};

const outsideFloor = "sprites/ground/outside-floor.png";
const groundTile = "sprites/ground/grass.png";
rooms["the-town-outside"] = {
  name: "Postmark",
  walls: {
    topWall:    { orientation: "horizontal", x: 0, y: 2,  width: 100, height: 2.5, style: "brick" },
    bottomWall: { orientation: "horizontal", x: 0, y: 95, width: 100, height: 2.5, style: "brick" },
    leftWall:   { orientation: "vertical",   x: 0, y: 2,  width: 1.2, height: 95, style: "brick" },
    rightWall:  { orientation: "vertical",   x: 98.8, y: 2, width: 1.2, height: 95, style: "brick" },
  },
  doors: {},
  applications: outsideBuildings,
  // one composed floor: grass + the atlas's river + region washes (make-floor.mjs)
  ...(existsSync(join(ROOT, "public", outsideFloor))
    ? { floor_image: outsideFloor, floor_tile: false }
    : existsSync(join(ROOT, "public", groundTile))
      ? { floor_image: groundTile, floor_tile: true, floor_tile_size: 48 }
      : { floor_pattern: "repeating-linear-gradient(0deg, #101826 0 24px, #0d141f 24px 48px)" }),
};

rooms["the-town-centre"] = {
  name: "the Post Office",
  walls: walls(),
  doors: {
    "to-outside": { x: 46, y: 89, width: 8, height: 8, leadsTo: "the-town-outside", orientation: "down" },
  },
  applications: {
    "the-post-office": {
      name: "the post office",
      command: `open:${SITE}/meeps/`,
      x: 44, y: 12, width: 1100, height: 700,
      text: "🏤\nthe post office",
    },
    "the-noticeboard": {
      name: "the town bulletin",
      command: `open:${SITE}/bulletin/`,
      x: 13, y: 14, width: 560, height: 220,
      text: "📌 bulletin",
    },
    "the-atlas-table": {
      name: "the atlas",
      command: `open:${SITE}/atlas/`,
      x: 78, y: 14, width: 560, height: 220,
      text: "🗺 the atlas",
    },
  },
  floor_pattern: HUB_FLOOR,
  floor_pattern_size: HUB_FLOOR_SIZE,
};

// ── the walker ──────────────────────────────────────────────────────────────
// PIXEL coordinates (rooms are percent; the character is not — npcts renders
// it at raw px). Sprites: PixelLab 4-direction views, one frame each for now.
const world = {
  userCharacter: {
    name: "you",
    x: 640, y: 430, width: 44, height: 58,
    spriteSheets: {
      up:    ["sprites/walker/up.png"],
      down:  ["sprites/walker/down.png"],
      left:  ["sprites/walker/left.png"],
      right: ["sprites/walker/right.png"],
    },
  },
  rooms,
};

const out = join(ROOT, "public", "world.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(world, null, 1) + "\n");
console.log(`wrote public/world.json — ${Object.keys(rooms).length} rooms (${Object.keys(outsideBuildings).length} buildings on the outside)`);
