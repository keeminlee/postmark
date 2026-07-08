// patch-npcts.mjs — tiny idempotent post-install patches on the pinned npcts
// dist. Each is an upstream PR candidate; until then this keeps us
// dependency-not-fork. Run automatically via the postinstall script.
//
// Patch 1: SpatialWorld hardcodes useRotation={true} on the user Character,
// which discards directional sprite views and CSS-rotates the down view —
// the walker visibly spins. We have real 4-direction PixelLab views; use them.
// (Upstream fix: expose useRotation as a SpatialWorld prop, default false.)

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const target = join(HERE, "..", "node_modules", "npcts", "dist", "ui", "spatial", "components", "SpatialWorld.js");

let src = readFileSync(target, "utf8");
const before = "useRotation: true";
const after = "useRotation: false";
if (src.includes(after)) {
  console.log("patch-npcts: already applied");
} else if (src.includes(before)) {
  src = src.replace(before, after);
  writeFileSync(target, src);
  console.log("patch-npcts: useRotation true -> false (directional sprites honored)");
} else {
  console.error("patch-npcts: FATAL — expected string not found; npcts version changed, re-check the patch");
  process.exit(1);
}
