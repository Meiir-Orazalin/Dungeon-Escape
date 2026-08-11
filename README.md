# Dungeon Escape

Dungeon Escape is a deterministic dark fantasy browser game. Version `v0.3.0` adds the first complete one-floor gameplay loop: explore a generated dungeon, take the Runic Key, open the Ancient Gate, and choose whether to replay that seed or enter a new dungeon.

Everything visible in the game is drawn from original programmatic Phaser shapes and textures. The project loads no external art, fonts, runtime CDNs, APIs, or backend services.

## Current playable functionality

- Title menu that starts by pointer, <kbd>Enter</kbd>, or <kbd>Space</kbd>
- Deterministic 72 × 44-tile dungeons containing 10–14 separated rooms
- Fully connected three-tile corridors with deterministic loop connections
- Time-based WASD and arrow-key movement with normalized diagonals
- Generated wall rendering and merged collision geometry from one shared mask
- A deterministic Runic Key in a third reachable room
- The Ancient Gate at the Phase 2 destination point
- Context-sensitive <kbd>E</kbd> interaction and sealed-gate feedback
- Objective, key status, elapsed timer, seed, controls, and discovery HUD
- A discovered-room minimap with hidden-until-discovered objective markers
- A polished **Dungeon Escaped** result with replay and new-dungeon controls
- Responsive 960 × 540 canvas over a 2304 × 1408 camera-followed world

Phase 3 intentionally does not contain enemies, combat, weapons, health, damage, traps, general loot, upgrades, multiple floors, audio, scoring, best times, persistence, or virtual mobile controls.

## Escape objective

Each validated dungeon receives one deterministic objective plan:

1. Explore the dungeon and **Find the Runic Key**.
2. Move within interaction range and press <kbd>E</kbd> to take it.
3. Find the **Ancient Gate**. Inspecting it before collecting the key confirms that it is sealed.
4. After the key is collected, press <kbd>E</kbd> at the gate to escape.
5. Review the completion time and discovered-room count, then replay the same seed or generate a new dungeon.

The Runic Key is a single objective item, not a general inventory system. The floor timer is session-only, freezes on completion, and does not create a score or best-time record.

## Seed contract

Use a URL seed to reproduce both the dungeon and objective plan:

```text
http://127.0.0.1:5173/?seed=ember-vault_42
```

- Letters, digits, hyphens, and underscores are preserved.
- Seeds are normalized to lowercase ASCII and limited to 48 characters.
- Spaces and unsupported character runs become hyphens.
- A non-empty `?seed=` value reproduces the same rooms, corridors, spawn, key, gate, and fingerprints in this application version.
- The normalized active seed is written to the URL with `history.replaceState` and no page reload.
- Without a URL seed, `crypto.getRandomValues` creates a friendly seed outside the deterministic generator.

## Restart and new-dungeon behavior

During active play and from the completion overlay:

- <kbd>R</kbd> replays the complete current floor with the same seed. It restores the Runic Key, reseals the Ancient Gate, resets the timer and discovery, and returns the player to spawn while preserving both fingerprints.
- <kbd>N</kbd> creates a new friendly seed, dungeon, objective plan, timer, and discovery state.
- From completion, <kbd>Enter</kbd> and <kbd>Space</kbd> also create a new dungeon.

This is an intentional Phase 3 extension of Phase 2, where <kbd>R</kbd> only returned the existing player to spawn.

## Minimap behavior

Only the spawn room is visible initially. Rooms remain discovered once entered, and a corridor appears after both endpoint rooms are discovered. The current or last-entered room remains highlighted.

Objective rooms are never revealed early. A discovered key room shows a Runic Key marker until collection. A discovered gate room shows a sealed marker before the key and a ready marker afterward.

## Technology

- pnpm 11.16.0
- Vite 8
- Vanilla TypeScript in strict mode
- Phaser 4.2.1 with Arcade Physics
- Vitest for movement, generation, objective, validation, discovery, interaction, and timer tests
- Playwright with Chromium for browser gameplay tests
- ESLint and Prettier

## Prerequisites

- Node.js `20.19.0` or newer, or `22.12.0` or newer
- pnpm `11.16.0` through Corepack or another compatible installation

## Installation

```bash
corepack enable
pnpm install --frozen-lockfile
```

Install the project-local Chromium binary before browser tests:

```bash
pnpm test:e2e:install
```

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

The preview is served at <http://127.0.0.1:4173>.

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

`pnpm check` runs formatting, ESLint, strict TypeScript, unit tests, and a production build. `pnpm test:e2e` builds production assets before Chromium runs so the suite can audit test-bridge isolation.

Use `pnpm test` for Vitest watch mode and `pnpm format` to format the repository.

## Controls

| Context      | Action                 | Controls                            |
| ------------ | ---------------------- | ----------------------------------- |
| Menu         | Start                  | Enter, Space, or **Start Game**     |
| Active floor | Move                   | WASD or arrow keys                  |
| Active floor | Interact               | E                                   |
| Active floor | Replay current seed    | R                                   |
| Active floor | Generate a new dungeon | N                                   |
| Completion   | Replay this seed       | R or **Replay This Seed**           |
| Completion   | Generate a new dungeon | N, Enter, Space, or **New Dungeon** |

## Project status

Phase 3 — Deterministic Escape Objective is implemented. See [the objective contract](docs/ESCAPE_OBJECTIVE.md), [the generation contract](docs/DUNGEON_GENERATION.md), [the implementation plan](docs/IMPLEMENTATION_PLAN.md), and [the phase status](docs/PHASE_STATUS.md).
