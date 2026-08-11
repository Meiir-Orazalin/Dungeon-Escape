# Dungeon Escape

Dungeon Escape is a dark fantasy browser game about exploring hostile underground halls. Version `v0.2.0` replaces the original handcrafted room with deterministic procedural dungeons while preserving the Phase 1 menu, movement, collision, restart, and responsive presentation.

Everything visible in the game is drawn from programmatically generated Phaser textures and shapes. The project does not load external art, fonts, runtime CDNs, APIs, or backend services.

## Current playable functionality

- Title menu that starts by pointer, <kbd>Enter</kbd>, or <kbd>Space</kbd>
- Deterministic 72 × 44-tile dungeons containing 10–14 separated rooms
- Fully connected three-tile corridors with a few deterministic loop connections
- Time-based movement using WASD or the arrow keys, including normalized diagonals
- Generated wall collision derived from the same mask used for rendering
- Camera-followed 2304 × 1408 worlds viewed through a responsive 960 × 540 canvas
- Safe room-centre spawning and exact same-layout restart with <kbd>R</kbd>
- New seeded dungeon generation with <kbd>N</kbd>
- A camera-fixed minimap that reveals rooms as they are entered
- Current seed and discovered-room count in the in-game HUD

Phase 2 intentionally has no keys, actionable exit, objective, enemies, combat, health, loot, upgrades, floor transitions, victory, or game-over systems. Objectives and combat remain future phases.

## Seed contract

Use a URL seed to reproduce a dungeon:

```text
http://127.0.0.1:5173/?seed=ember-vault_42
```

Seed behavior:

- Accepted seed characters are letters, digits, hyphens, and underscores.
- Seeds are trimmed, normalized to lowercase ASCII, and limited to 48 characters.
- Spaces and unsupported character runs become hyphens.
- A non-empty `?seed=` value reproduces the same rooms, corridors, spawn, metadata, and fingerprint in this application version.
- The normalized active seed is written back to the URL without reloading.
- Without a URL seed, the browser creates a friendly seed using `crypto.getRandomValues`; that seed then drives the entire deterministic pipeline.
- <kbd>R</kbd> returns to the current layout's spawn without changing its seed or fingerprint.
- <kbd>N</kbd> creates a new friendly seed and safely restarts the scene with a new layout.

## Minimap behavior

Only the spawn room is visible initially. Entering another room discovers it permanently for the current dungeon. The current or last-entered room is highlighted; while travelling through a corridor, that last room remains current. A corridor appears only after both rooms it connects have been discovered. Future destination metadata is never shown as an objective.

## Technology

- pnpm 11.16.0
- Vite 8
- Vanilla TypeScript in strict mode
- Phaser 4.2.1 with Arcade Physics
- Vitest for movement, generation, validation, and discovery tests
- Playwright with Chromium for browser smoke tests
- ESLint and Prettier

## Prerequisites

- Node.js `20.19.0` or newer, or `22.12.0` or newer
- pnpm `11.16.0` (Corepack can provide the version declared in `package.json`)

## Installation

```bash
corepack enable
pnpm install --frozen-lockfile
```

Install the project-local Chromium binary before running browser tests:

```bash
pnpm test:e2e:install
```

The downloaded browser is stored in an ignored `.playwright-browsers` directory.

## Development

```bash
pnpm dev
```

Open <http://127.0.0.1:5173>.

## Production build

```bash
pnpm build
pnpm preview
```

The production preview is served at <http://127.0.0.1:4173>.

## Tests and quality checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm test:e2e
pnpm check
```

`pnpm check` runs formatting, ESLint, strict TypeScript, unit tests, and a production build. `pnpm test:e2e` also creates a production build before running Chromium so it can verify that the test-only bridge is absent from production assets.

Use `pnpm test` for Vitest watch mode and `pnpm format` to format the repository.

## Controls

| Action                  | Controls                                       |
| ----------------------- | ---------------------------------------------- |
| Move                    | WASD or arrow keys                             |
| Move diagonally         | Hold one horizontal and one vertical direction |
| Start from menu         | Enter, Space, or select **Start Game**         |
| Return to current spawn | R                                              |
| Generate a new dungeon  | N                                              |

## Project status

Phase 2 — Deterministic Procedural Dungeon Generation is implemented. See [the generation contract](docs/DUNGEON_GENERATION.md), [the implementation plan](docs/IMPLEMENTATION_PLAN.md), and [the verified phase status](docs/PHASE_STATUS.md) for details and evidence.
