/**
 * turtle.mjs — pure ESM L-system → SVG renderer
 * No DOM APIs. Runs in Node or browser.
 */

// darken a #rrggbb hex by factor f (0..1) — used to shade deeper/inner leaves a second tone
function darkenHex(hex, f) {
  const m = hex.replace('#', '');
  if (m.length !== 6) return hex;
  const ch = (i) => parseInt(m.slice(i, i + 2), 16);
  const d = (c) => Math.max(0, Math.round(c * (1 - f))).toString(16).padStart(2, '0');
  return `#${d(ch(0))}${d(ch(2))}${d(ch(4))}`;
}

/**
 * Expand an L-system string for `iterations` generations.
 * @param {string} axiom  - starting string
 * @param {Object} rules  - { 'X': 'F+[[X]-X]', 'F': 'FF', ... }
 * @param {number} iterations
 * @returns {string}
 */
function expandLSystem(axiom, rules, iterations) {
  let current = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const ch of current) {
      next += rules[ch] !== undefined ? rules[ch] : ch;
    }
    current = next;
  }
  return current;
}

/**
 * Interpret an L-system string with a turtle and produce SVG path data.
 *
 * Symbols:
 *   F  — draw forward (length * lengthFalloff^depth)
 *   f  — move forward without drawing
 *   +  — turn left by angle
 *   -  — turn right by angle
 *   [  — push state
 *   ]  — pop state
 *
 * @param {string} axiom
 * @param {Object} rules
 * @param {number} iterations
 * @param {Object} params
 *   angle        — turning angle in degrees (default 25)
 *   baseLength   — base segment length (default 8)
 *   lengthFalloff — multiplied per branch depth (default 0.95)
 *   baseWidth    — stroke width at root (default 3)
 *   widthFalloff — width multiplied per push (default 0.65)
 *   leafSize     — radius of leaf ellipse (default 4)
 *   strokeColor  — branch color (default '#4a3728')
 *   leafColor    — leaf fill (default '#6aaa5e')
 *   margin       — SVG margin in px (default 20)
 * @returns {string} complete <svg ...>...</svg> string
 */
export function lsystemToSVG(axiom, rules, iterations, params = {}) {
  const {
    angle       = 25,
    baseLength  = 8,
    lengthFalloff = 0.95,
    baseWidth   = 3,
    widthFalloff = 0.65,
    leafSize    = 4,
    strokeColor = '#4a3728',
    leafColor   = '#6aaa5e',
    margin      = 20,
  } = params;

  const sentence = expandLSystem(axiom, rules, iterations);

  // Turtle state
  let x = 0, y = 0;
  // Start pointing up (−90° in standard math coords, since SVG y increases downward)
  let heading = -90;
  let depth = 0; // bracket nesting depth
  const stack = [];

  // Collect SVG elements as strings
  const paths = [];
  const leaves = [];

  // Track bounding box
  let minX = 0, maxX = 0, minY = 0, maxY = 0;

  function updateBounds(px, py) {
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;

  for (const ch of sentence) {
    switch (ch) {
      case 'F': {
        // Length tapers with depth
        const len = baseLength * Math.pow(lengthFalloff, depth);
        const w   = Math.max(0.3, baseWidth * Math.pow(widthFalloff, depth));

        const nx = x + len * Math.cos(toRad(heading));
        const ny = y + len * Math.sin(toRad(heading));

        updateBounds(x, y);
        updateBounds(nx, ny);

        paths.push(
          `<line x1="${x.toFixed(2)}" y1="${y.toFixed(2)}" ` +
          `x2="${nx.toFixed(2)}" y2="${ny.toFixed(2)}" ` +
          `stroke="${strokeColor}" stroke-width="${w.toFixed(2)}" stroke-linecap="round"/>`
        );

        x = nx;
        y = ny;
        break;
      }
      case 'f': {
        const len = baseLength * Math.pow(lengthFalloff, depth);
        x += len * Math.cos(toRad(heading));
        y += len * Math.sin(toRad(heading));
        updateBounds(x, y);
        break;
      }
      case '+':
        heading += angle;
        break;
      case '-':
        heading -= angle;
        break;
      case '[':
        stack.push({ x, y, heading, depth });
        depth++;
        break;
      case ']': {
        const prev = stack.pop();
        if (!prev) break;

        // Leaf at EVERY branch tip (lush, not just deep terminals); size tapers
        // with depth but stays visible so sparse specimens still read as living.
        const rx = Math.max(2.6, leafSize * Math.pow(0.9, Math.max(0, depth - 1)));
        const ry = rx * 0.5;
        const rot = heading + 90;
        updateBounds(x - rx, y - rx);
        updateBounds(x + rx, y + rx);
        // deeper/inner leaves take a darker second tone, giving the canopy depth
        const lf = darkenHex(leafColor, Math.min(0.4, Math.max(0, depth - 1) * 0.07));
        leaves.push(
          `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" ` +
          `rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" ` +
          `transform="rotate(${rot.toFixed(1)},${x.toFixed(2)},${y.toFixed(2)})" ` +
          `fill="${lf}" opacity="0.8"/>`
        );

        x = prev.x;
        y = prev.y;
        heading = prev.heading;
        depth = prev.depth;
        break;
      }
      default:
        // Other symbols (X, Y, etc.) are ignored by the turtle
        break;
    }
  }

  // Compute SVG dimensions from bounding box
  const viewW = (maxX - minX) + margin * 2;
  const viewH = (maxY - minY) + margin * 2;

  // Offset transform: shift all elements so (minX, minY) maps to (margin, margin)
  const dx = margin - minX;
  const dy = margin - minY;

  const allElements = [...paths, ...leaves].join('\n  ');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${viewW.toFixed(0)}" height="${viewH.toFixed(0)}" ` +
    `viewBox="0 0 ${viewW.toFixed(2)} ${viewH.toFixed(2)}">\n` +
    `  <g transform="translate(${dx.toFixed(2)},${dy.toFixed(2)})">\n  ` +
    allElements +
    `\n  </g>\n</svg>`
  );
}
