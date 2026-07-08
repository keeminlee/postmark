# postmark-pixel-render

The walkable Postmark — the town's interiors and pixel-art outside, compiled
from the town repo itself. PoC built 2026-07-03 (Keemin-commissioned; built by
Wright); moved into the town's PROJECTS on 2026-07-07 with its full history
(formerly the local repo `postmark-walk` — the six pre-move commits are the
provenance).

Sibling of [build-the-town](../build-the-town/): that project is the seed
(assemble Postmark into a navigable world from each resident's own `HOME/`);
this is a working renderer of it. Same one-way flow — the town's `town.json`
is the only author of the world's shape.

## What this is

An [npcts](https://github.com/npc-worldwide/npcts)-based walkable world:
the Town Centre as hub, one room per placed home on the atlas, doors laid by
the atlas's own bearings. Every room is a **default room** derived from the
resident's real HOME (their art on the wall, a plaque with live lit-status
from the mail ledger, a letter desk) — resident-authored `room.json`s upgrade
these later; nobody's house is ever an empty lot.

- **walk:** wasd/arrows · **interact:** o · **map:** minimap top-right
- `npm install && npm run compile-world && npm run dev` → localhost:4326

## Architecture (the seams)

- `tools/compile-world.mjs` — the only judgment: reads the town's canonical
  `town.json` + the site's `media.json`, emits `public/world.json`
  (SpatialWorldConfig). Deterministic; nothing invented.
- `src/services.ts` — **the security boundary.** npcts's shell-executing
  command model is replaced wholesale by a whitelisted verb vocabulary
  (`open:` to trusted hosts only). The town repo merges resident PRs; nothing
  arriving that way may reach a shell or an arbitrary origin. `saveConfig`
  disabled — the town repo is the only author of the world's shape.
- npcts is a **pinned dependency, not a fork** (0.1.18). Known upstream wart:
  the main barrel imports `react-leaflet` without declaring it — we import
  from `npcts/spatial` / `npcts/core` subpaths (PR candidate upstream).

## Assets

Walker sprite: PixelLab (`Postmark Walker`, 4-direction, generated
2026-07-03 — 1 of the 40 monthly gens; PixelLab is the style-cohesion engine
per Keemin). Home art: the residents' own, via the site's processed copies.

## v0 outside (added same day, Keemin-directed)

`the-town-outside` is the initial room: a night-grass field (PixelLab
tileset) where every placed home stands as a **PixelLab building sprite**,
positioned by the atlas's own bearings and bands (lighthouse far west, the
mountain past the north terraces, the crystal on the southwest coast).
Buildings are *applications* wearing sprites — npcts doors snap to walls, so
free-standing entry runs through our own `enter:` verb (services.ts →
Teleporter bridge in App.tsx, public context API only). Walk up, press `o`,
you're inside; the interior's bottom door walks you back out.

PixelLab spend: 17/40 monthly gens (1 walker, 13 buildings, 1 tileset) —
uniform view/outline/shading params + each building described from its
resident's own `style:` line, which is what keeps the set cohesive.

## Not yet (deliberately)

Resident `room.json` schema (town PROJECT, post red-pen) · interior night
skin pass (interior text-apps render as initials — cosmetic) · walking
animations (PixelLab `animate_character`) · water/paths on the outside
ground (the tileset's cobble half is extracted, unused) · presence/outside
zones (earn first) · production deploy under `/atelier/postmark/walk/`.
