// geometry.mjs — the single source for the walk's world geometry.
// Everything is authored on the ATLAS CANVAS (1200x1600 portrait — the same
// coordinate space as render-town.mjs), then projected into the landscape
// room viewport as a centered portrait strip, zoomed out so the far places
// (the Peak at the river's head, the coasts) fit on screen.

export const ATLAS_W = 1200, ATLAS_H = 1600;
export const VIEW_W = 1400, VIEW_H = 850;

// fit the full atlas canvas by height, centered horizontally
const S = (VIEW_H * 0.97) / ATLAS_H;           // ~0.515 px per atlas unit
const OFF_X = (VIEW_W - ATLAS_W * S) / 2;      // side margins = open ground
const OFF_Y = VIEW_H * 0.015;

export const project = (x, y) => ({ X: OFF_X + x * S, Y: OFF_Y + y * S });
export const projectPct = (x, y) => {
  const { X, Y } = project(x, y);
  return { x: (X / VIEW_W) * 100, y: (Y / VIEW_H) * 100 };
};
export const scale = S;
export const margins = { left: OFF_X, right: OFF_X };

// the atlas's river (render-town.mjs WATER_WAYPOINTS), with the head bent to
// flow down from the Pando Peak (Keemin-directed for the walk: the mountain
// is the source; the Grove below it holds the emergence, per its own ledger
// note). The ledger's bearing for the Peak stays N — reconcile upstream when
// the atlas drawing gains the six new placements.
export const WATER = [
  { x: 255, y: 10, w: 6 }, { x: 235, y: 60, w: 16 }, { x: 210, y: 110, w: 24 },
  { x: 240, y: 180, w: 34 },
  { x: 280, y: 300, w: 46 }, { x: 335, y: 430, w: 60 }, { x: 395, y: 560, w: 80 },
  { x: 445, y: 670, w: 108 }, { x: 485, y: 760, w: 148 }, { x: 515, y: 860, w: 118 },
  { x: 550, y: 970, w: 122 }, { x: 590, y: 1080, w: 130 }, { x: 635, y: 1200, w: 142 },
  { x: 685, y: 1320, w: 158 }, { x: 740, y: 1440, w: 178 }, { x: 790, y: 1560, w: 200 },
  { x: 815, y: 1630, w: 222 },
];

export const CENTRE_XY = { x: 485, y: 760 };

// homes on the atlas canvas: render-town.mjs HOME_XY verbatim; the six new
// placements (*) read off the same canvas from their placement semantics.
export const ATLAS_XY = {
  "the-trueing-house": { x: 600, y: 240 },
  "the-lanternstep-house": { x: 620, y: 600 },
  "the-threshold-house": { x: 720, y: 858 },
  "the-lock-house": { x: 960, y: 1470 },
  "the-heart-house": { x: 210, y: 250 },
  "the-calcite-hearth": { x: 560, y: 1468 },
  "the-pando-peak": { x: 255, y: 45 },         // (*) the river's head — the source
  "the-fieldstone-study": { x: 990, y: 470 },  // (*) the east rise
  "the-clearing": { x: 1090, y: 580 },         // (*) east rise, slightly apart
  "the-clear-house": { x: 1050, y: 380 },      // (*) east rise, above the fog — third Reeves home
  "the-still-reach": { x: 640, y: 1060 },      // (*) inside of the eastern bend
  "the-still-here-light": { x: 120, y: 1450 }, // (*) far headland past the Doubled Coast
  "the-returning-house": { x: 1080, y: 1570 }, // (*) east coastline, seaward edge
};

// region washes (render-town.mjs REGION_LAYOUT + semantic placements for the
// two young regions)
export const REGIONS = [
  { name: "the Trueing Terrace", cx: 670, cy: 280, rx: 175, ry: 150, wash: "#7d8f86" },
  { name: "the Lanternseed Gardens", cx: 670, cy: 560, rx: 175, ry: 145, wash: "#7a9c5a" },
  { name: "the Long Run", cx: 1010, cy: 1460, rx: 140, ry: 145, wash: "#a8895a" },
  { name: "the Protected Grove", cx: 210, cy: 235, rx: 135, ry: 112, wash: "#4a7d5f" },
  { name: "the Doubled Coast", cx: 545, cy: 1465, rx: 165, ry: 80, wash: "#8f7a9c" },
  { name: "the Threshold District", cx: 795, cy: 1025, rx: 150, ry: 190, wash: "#6b7a8c" },
  { name: "the Reach", cx: 145, cy: 1290, rx: 110, ry: 170, wash: "#5f7a8c" },
  { name: "Aelyria", cx: 1080, cy: 1550, rx: 130, ry: 90, wash: "#7a6b9c" },
];
