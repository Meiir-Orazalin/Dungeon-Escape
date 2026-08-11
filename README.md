# Dungeon Escape

Dungeon Escape is a deterministic dark-fantasy browser action game. Version `v0.4.0` surrounds the existing one-floor Runic Key and Ancient Gate objective with reproducible room encounters, three enemy archetypes, melee combat, a dash, five-point health, and player defeat.

Everything visible is drawn with original programmatic Phaser shapes and textures. The project loads no external art, fonts, runtime CDNs, APIs, or backend services.

## Current playable functionality

- Pointer, <kbd>Enter</kbd>, or <kbd>Space</kbd> title-menu start
- Deterministic 72 × 44-tile dungeons with 10–14 rooms and connected three-tile corridors
- One deterministic enemy in every non-spawn room: 9–13 enemies per dungeon
- Bone Stalker melee pursuit, Ash Wisp projectiles, and Stone Warden charges
- Room-local enemy activation: undiscovered enemies remain dormant and disengaged enemies return home
- Directional sword attacks with <kbd>Space</kbd>, <kbd>J</kbd>, or a camera-correct pointer aim
- Directional, wall-colliding, temporarily invulnerable <kbd>Shift</kbd> dash
- Five-point player health, contact/projectile damage, hit stun, knockback, and invulnerability
- Deterministic Runic Key and Ancient Gate objective with <kbd>E</kbd> interaction
- Escaped and defeated overlays with same-seed replay and new-dungeon controls
- Combat-aware HUD and discovered-only minimap objective/threat markers
- Responsive 960 × 540 canvas over a 2304 × 1408 camera-followed world

Enemies drop nothing. Loot, upgrades, multiple floors, bosses, traps, audio, scoring, best times, persistence, and virtual controls remain deferred.

## Combat and escape loop

1. Explore until a room is discovered and its room-bound enemy awakens.
2. Fight with the directional sword or evade with the dash. Killing enemies is optional.
3. Find the **Runic Key** and press <kbd>E</kbd> to take it.
4. Reach the **Ancient Gate**. It remains sealed until the key is collected.
5. Press <kbd>E</kbd> at the ready gate to escape—even if enemies are still alive.
6. Replay the same deterministic run or generate a new dungeon after escape or defeat.

The timer freezes on either terminal outcome. Completion statistics show health and defeated enemies, but they are session information rather than a score or persistent record.

## Seed contract

Use a URL seed to reproduce the dungeon, objective, and encounter plan:

```text
http://127.0.0.1:5173/?seed=ember-vault_42
```

- Letters, digits, hyphens, and underscores are preserved.
- Seeds normalize to lowercase ASCII and are limited to 48 characters.
- A non-empty `?seed=` reproduces the same rooms, corridors, spawn, key, gate, enemies, and three fingerprints in this application version.
- The active seed is written with `history.replaceState` without reloading.
- Without a URL seed, `crypto.getRandomValues` creates a friendly seed outside deterministic generation.

## Restart and new-dungeon behavior

- <kbd>R</kbd> performs a full same-seed replay during active play or from either terminal overlay. It restores full health, dash readiness, all enemies at full health, the key, sealed gate, zero timer, spawn-only discovery, default east facing, and the original spawn while preserving layout, objective, and encounter fingerprints.
- <kbd>N</kbd> creates a new friendly seed, dungeon, objective plan, encounter plan, and fresh runtime state.
- From escape or defeat, <kbd>Enter</kbd> and <kbd>Space</kbd> also create a new dungeon.

## Minimap behavior

Only the spawn room is initially visible. Rooms remain discovered after entry, while corridors appear after both endpoint rooms are discovered.

Objective and threat markers never reveal undiscovered rooms. A discovered living-enemy room has one stable threat marker, removed on death. Key and gate markers retain their discovered-only Phase 3 rules and may coexist with a threat marker.

## Technology

- pnpm 11.16.0
- Vite 8
- Vanilla strict TypeScript
- Phaser 4.2.1 with Arcade Physics
- Vitest for deterministic generation, objective, encounter, combat, AI, and helper tests
- Playwright with Chromium for real browser gameplay paths
- ESLint and Prettier

## Prerequisites

- Node.js `20.19.0` or newer, or `22.12.0` or newer
- pnpm `11.16.0` through Corepack or another compatible installation

## Installation

```bash
corepack enable
pnpm install --frozen-lockfile
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

`pnpm check` runs formatting, ESLint, strict TypeScript, unit tests, and a production build. `pnpm test:e2e` builds production assets before Chromium runs and audits test-bridge isolation. Use `pnpm test` for Vitest watch mode and `pnpm format` to format the repository.

## Controls

| Context              | Action                 | Controls                            |
| -------------------- | ---------------------- | ----------------------------------- |
| Menu                 | Start                  | Enter, Space, or **Start Game**     |
| Active floor         | Move                   | WASD or arrow keys                  |
| Active floor         | Sword attack           | Space, J, or left pointer button    |
| Active floor         | Dash                   | Shift                               |
| Active floor         | Interact               | E                                   |
| Active floor         | Replay current seed    | R                                   |
| Active floor         | Generate a new dungeon | N                                   |
| Completion or defeat | Replay this seed       | R or **Replay This Seed**           |
| Completion or defeat | Generate a new dungeon | N, Enter, Space, or **New Dungeon** |

## Project status

Phase 4 — Deterministic Enemies and Combat is implemented. See [combat and enemies](docs/COMBAT_AND_ENEMIES.md), [the escape-objective contract](docs/ESCAPE_OBJECTIVE.md), [the generation contract](docs/DUNGEON_GENERATION.md), [the implementation plan](docs/IMPLEMENTATION_PLAN.md), and [the phase status](docs/PHASE_STATUS.md).
