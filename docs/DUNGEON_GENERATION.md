# Dungeon Generation Contract

## Overview

Phase 2 uses a pure TypeScript, tile-based generator. Phaser receives an already generated and validated read-only `DungeonLayout`; it does not decide room placement, corridor shape, reachability, spawn selection, wall geometry, or fingerprints.

The default layout is 72 × 44 tiles at 32 pixels per tile, producing a 2304 × 1408-pixel world. Generation is performed only when a dungeon is entered or replaced with <kbd>N</kbd>, never during the scene update loop.

## Seed normalization

A seed is normalized with the following stable contract:

1. Apply Unicode NFKD normalization and remove combining marks.
2. Trim surrounding whitespace and convert letters to lowercase.
3. Convert whitespace and unsupported character runs to hyphens.
4. Preserve ASCII letters, digits, hyphens, and underscores.
5. Collapse repeated hyphens, trim leading or trailing separators, and limit the result to 48 characters.
6. Use `forgotten-vault` if normalization would otherwise be empty.

`URLSearchParams` reads `?seed=` safely. A malformed encoded value is normalized rather than allowed to crash the game. The normalized active seed is written with `history.replaceState`, without a reload.

When no URL seed exists, `crypto.getRandomValues` selects a readable adjective, place, and hexadecimal suffix. This one non-deterministic step happens outside the generator. The resulting string is then the sole input to deterministic generation.

## PRNG

The normalized seed is hashed to a 32-bit FNV-1a value. Each bounded generation retry hashes the normalized seed together with its zero-based attempt number. A small Mulberry32-style PRNG owns that state and provides:

- floats in `[0, 1)`;
- inclusive integer ranges;
- choice from a non-empty array;
- probability-based booleans; and
- Fisher–Yates shuffling.

Invalid bounds, empty choices, and invalid probabilities throw useful range errors. Dungeon generation and seed-derived decoration never call `Math.random()`.

## Default configuration

| Setting                     |                     Value |
| --------------------------- | ------------------------: |
| Tile size                   |                     32 px |
| Map                         |             72 × 44 tiles |
| Room count                  |                     10–14 |
| Room width                  |                7–13 tiles |
| Room height                 |                6–11 tiles |
| Room padding                |                   2 tiles |
| Corridor width              |                   3 tiles |
| Solid outer margin          |                   2 tiles |
| Room-placement attempts     |   360 per dungeon attempt |
| Dungeon attempts            |                32 maximum |
| Extra graph connections     |                       1–3 |
| Spawn/destination clearance | One full surrounding tile |

## Room placement

Each attempt chooses a target between 10 and 14 rooms. Candidates use deterministic dimensions and positions, remain inside the two-tile safe border, and are accepted only when their padded rectangle does not intersect an existing padded room. IDs are assigned sequentially in accepted placement order and remain stable for that generated layout.

An attempt with fewer than 10 accepted rooms is rejected. The default configuration normally succeeds on its first attempt; retries exist as a bounded safety mechanism rather than a substitute for reliable placement.

## Room graph and corridors

Every pair of room centers forms a weighted candidate edge using squared Euclidean distance. Kruskal's algorithm selects a minimum spanning tree, proving that all room nodes are connected. One to three additional deterministic nearby edges introduce loops.

Each edge is carved as a three-tile-wide orthogonal corridor. Both horizontal-first and vertical-first bends are scored for intersections with unrelated room interiors; the lower-intersection orientation wins, with a seeded coin flip for ties. Corridors may cross existing corridors. Rooms are carved before corridors, so any valid intersection is included in the final walkable component and validated as actual geometry.

## Spawn and destination metadata

The generator approximates graph-diameter endpoints using two breadth-first graph traversals. One endpoint becomes the spawn room and the other becomes the future destination room. Their room centers provide safe, well-cleared positions.

Spawn and destination always use different rooms, are walkable, and are reachable through both the room graph and carved floor. Destination data is metadata only in Phase 2: it is not rendered, announced, actionable, or able to complete a floor.

### Cross-phase use in Phase 3

Phase 2 generated and validated the destination metadata without rendering a gate or objective. Phase 3 now consumes that unchanged metadata as the Ancient Gate position. This later use does not retroactively make the gate part of the published Phase 2 release, and the Phase 2 layout fingerprint remains structural.

## Validation invariants

Every candidate layout passes a dedicated pure validator before Phaser receives it. Validation checks:

- configured room count, border, dimensions, separation, and unique IDs;
- walkable room centers, spawn, and destination;
- full spawn and destination clearance;
- connected room graph and valid connection IDs;
- reachability of every room center and every carved floor tile from spawn;
- different spawn and destination rooms;
- exact world-to-tile dimensions;
- corridor width compatibility;
- an exact boundary-wall mask around floor;
- collision rectangles that cover every wall tile and no floor tile;
- finite generated coordinates; and
- a generation-attempt number within the 32-attempt bound.

Validation returns detailed error messages. An invalid attempt derives a deterministic next attempt seed. Exhausting the bound throws `DungeonGenerationError` with the normalized seed and last validation reasons; it cannot loop indefinitely or silently enter a partial dungeon.

## Layout fingerprint

The compact `dg-xxxxxxxx` fingerprint uses an incremental 32-bit hash over explicitly ordered structure:

- normalized seed and map dimensions;
- rooms in stable ID order;
- ordered room connections and corridor orientations;
- walkable tile indices;
- spawn and destination room IDs and coordinates.

It does not depend on object identity, unrelated object-key order, time, date, browser size, or Phaser state. The fingerprint is computed once during generation and used only for stable testing and diagnostics.

## Collision geometry and rendering

The floor mask is the single source of truth. A solid tile becomes a visible wall when any of its eight neighbors is walkable. The renderer draws floor and wall visuals directly from those masks, so visible and physical boundaries align.

Adjacent wall tiles are first merged into horizontal runs, then vertically merged when consecutive rows have the same run. Phaser receives one static Arcade Physics zone per merged rectangle rather than one body per wall tile. Rectangles cover the wall mask exactly and never overlap walkable tile centers.

Floor tint variation, cracks, and a bounded set of at most 14 torches are derived from the normalized seed with integer mixing. Decoration is non-colliding, does not conceal walls, and uses a single shared torch tween.

## Minimap discovery

The spawn room begins discovered. Room containment uses inclusive lower bounds and exclusive upper bounds. Entering an undiscovered room adds its ID once; entering a known room makes it current. While the player is in a corridor, the last room remains current.

Only discovered rooms are drawn. A corridor becomes visible when both endpoint rooms are discovered. The current room and its center indicator are highlighted. The minimap updates only when discovery or the current room changes, remains fixed to the camera, and never identifies the future destination.

## Intentionally deferred

Phase 2 does not implement keys, an actionable exit, completion objectives, enemies, combat, health, damage, traps, loot, chests, potions, upgrades, multiple floors, victory, defeat, or audio. Those remain assigned to later phases.
