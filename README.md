# Dungeon Escape

Dungeon Escape is a dark fantasy browser game about finding a way through hostile underground halls. Version `v0.1.0` is the Phase 1 foundation: a deliberately small, polished movement prototype with a title menu and one handcrafted dungeon room.

Everything visible in the game is drawn from programmatically generated Phaser textures and shapes. The project does not load external art, fonts, runtime CDNs, APIs, or backend services.

## Current playable functionality

- Title menu that starts by pointer, <kbd>Enter</kbd>, or <kbd>Space</kbd>
- One 1280 × 720 dungeon room viewed through a lightly following 960 × 540 camera
- Time-based movement using WASD or the arrow keys
- Simultaneous directional input with normalized diagonal speed
- Solid outer walls and seven solid interior obstacles
- Directional player feedback, torch accents, and subtle floor variation
- Instant return to the original spawn point with <kbd>R</kbd>
- Responsive, centered 16:9 canvas with a no-scroll page shell

## Technology

- pnpm 11.16.0
- Vite 8
- Vanilla TypeScript in strict mode
- Phaser 4.2.1 with Arcade Physics
- Vitest for pure movement tests
- Playwright with Chromium for browser smoke tests
- ESLint and Prettier

## Prerequisites

- Node.js `20.19.0` or newer, or `22.12.0` or newer
- pnpm `11.16.0` (Corepack can provide the package-manager version declared in `package.json`)

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

`pnpm check` runs the non-browser quality gates: formatting, ESLint, strict TypeScript, unit tests, and a production build. Playwright is kept as a separate required local smoke test because it needs an installed browser.

Use `pnpm test` for Vitest watch mode and `pnpm format` to format the repository.

## Controls

| Action           | Controls                                       |
| ---------------- | ---------------------------------------------- |
| Move             | WASD or arrow keys                             |
| Move diagonally  | Hold one horizontal and one vertical direction |
| Start from menu  | Enter, Space, or select **Start Game**         |
| Restart at spawn | R                                              |

## Project status

Phase 1 — Foundation and Playable Movement Prototype is implemented. Later systems such as procedural dungeon generation, escape objectives, enemies, combat, loot, upgrades, and multi-floor runs remain explicitly deferred to their planned phases.

See [the implementation plan](docs/IMPLEMENTATION_PLAN.md) and [the verified phase status](docs/PHASE_STATUS.md) for scope and evidence.
