# Dungeon Escape

Dungeon Escape is a deterministic dark-fantasy browser action game. Version `v0.6.0` connects generation, objectives, combat, loot, and run upgrades into one complete three-floor run while preserving the secure GitHub Pages deployment.

Everything visible is drawn with original programmatic Phaser shapes and textures. The project loads no external art, fonts, runtime CDNs, APIs, analytics, or backend services.

## Play online

Canonical production URL: <https://meiirorazalin.com/>

Fixed-run example: <https://meiirorazalin.com/?seed=phase6-production-review>

**Current deployment status:** Live at <https://meiirorazalin.com/>. Every verified push to `main` automatically deploys the `dist` artifact through GitHub Pages, followed by the bridge-free production smoke suite.

## Current playable functionality

- One URL run seed deterministically plans exactly three floors and one `rn-xxxxxxxx` run fingerprint
- **Floor 1 — The Shifting Catacombs**, using the URL seed and exact Phase 5 floor-planning compatibility
- **Floor 2 — The Ember Vaults**, using a deterministic derived floor seed and pressure difficulty
- **Floor 3 — The Obsidian Sanctum**, using a second derived seed and the strongest regular-enemy profile
- An independent Runic Key and Ancient Gate objective on every floor
- Bone Stalker pursuit, Ash Wisp projectiles, and Stone Warden charges; enemies remain optional
- Exactly three deterministic Treasure Chests, deterministic enemy rewards, Runic Shards, and immediate Vitality Flasks per floor
- A fresh Runeforge on every floor, with purchases costing 6 and then 8 shards
- Eight one-time upgrades, at most two purchases per floor and six throughout the run
- Health, available shards, total collected shards, and selected upgrades carry between floors
- Descending restores exactly one health, clamped to the effective maximum
- Floor Cleared transitions after Floors 1 and 2, run victory after Floor 3, and whole-run defeat on any floor
- Separate floor/run timers, run-aware HUD, and a current-floor-only discovered minimap
- Responsive 960 × 540 canvas over each generated 2304 × 1408 camera-followed world

There is no general inventory or permanent progression. Reloading the URL starts a fresh Floor 1 run. Bosses, traps, equipment, audio, scoring, persistence, save games, virtual controls, and Phase 7 remain deferred.

## Run, combat, loot, and reset behavior

Each floor is a complete deterministic dungeon with its own layout, objective, encounter, and loot fingerprints. Collect the **Runic Key** and open the **Ancient Gate** to advance; unopened chests, uncollected loot, unpurchased upgrades, and living enemies never block progression.

Enemies and optional **Treasure Chests** yield **Runic Shards**. **Vitality Flasks** immediately heal two points only when injured. The safe spawn room contains a **Runeforge** with deterministic three-card offers. Each floor allows two purchases at 6 then 8 shards; the global Run Build may contain six unique upgrades:

- Tempered Edge: melee damage `1 → 2`
- Long Reach: melee range `58 → 76 px`
- Quickened Steel: recovery `105 → 75 ms`, cooldown `330 → 260 ms`
- Fleet Sigil: dash cooldown `900 → 650 ms`
- Vital Rune: maximum health `5 → 6` and restore one health on selection
- Aegis Rune: post-hit protection `850 → 1,150 ms`
- Windstep Sigil: ordinary movement speed multiplier `1.15`
- Stalwart Rune: hit stun `130 → 90 ms`, knockback duration `120 → 80 ms`

During an active run, <kbd>R</kbd> replays the current floor from its entry checkpoint. Progress from prior completed floors is preserved; current-attempt health, shards, loot, objectives, discoveries, purchases, and time are discarded. From run victory or defeat, <kbd>R</kbd> restarts the entire same-seed run at Floor 1 with base health, zero shards, no upgrades, no statistics, and the identical RunPlan. <kbd>N</kbd> creates a new run seed and a new three-floor plan.

## Deterministic run-seed contract

The sole `?seed=` value represents the complete run. Letters, digits, hyphens, and underscores normalize to lowercase ASCII with a 48-character maximum. Floor 1 uses that normalized seed exactly. Floors 2 and 3 use stable versioned derived seeds; floor transitions do not change the URL.

The same run seed reproduces all three ordered floor seeds, themes, difficulty profiles, twelve existing floor fingerprints, and the additional run fingerprint in this application version. Player choices affect carry state and later upgrade offers, but never regenerate a future floor. `crypto.getRandomValues` is used only to create a friendly new run seed outside deterministic planning.

## Technology

- pnpm 11.16.0 and Node.js 24 in deployment workflows
- Vite 8 with explicit production base `/`
- Vanilla strict TypeScript
- Phaser 4.2.1 with Arcade Physics
- Vitest and Playwright with Chromium
- GitHub Pages deployed by GitHub Actions from `main`
- ESLint and Prettier

## Installation and local development

Prerequisites are Node.js `20.19.0` or newer, or `22.12.0` or newer, and pnpm `11.16.0`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test:e2e:install
pnpm dev
```

Open <http://127.0.0.1:5173/>.

## Production build and audit

```bash
pnpm build
pnpm audit:production
pnpm preview
```

The audit checks production metadata, root-relative assets, generated image dimensions, manifest data, artifact hygiene, and complete E2E-bridge isolation. Branding assets are committed source assets and are not regenerated by the normal build.

## Tests and quality checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm test:e2e
pnpm check
LIVE_BASE_URL=https://meiirorazalin.com pnpm test:live
```

Local E2E tests use a build-time-isolated bridge for deep deterministic gameplay coverage. Live tests are bridge-free and verify public metadata, redirects, startup, assets, HTTPS, and production isolation.

## Controls

| Context            | Action                         | Controls                             |
| ------------------ | ------------------------------ | ------------------------------------ |
| Menu               | Start run                      | Enter, Space, or **Start Game**      |
| Active floor       | Move                           | WASD or arrow keys                   |
| Active floor       | Sword attack                   | Space, J, or left pointer button     |
| Active floor       | Dash                           | Shift                                |
| Active floor       | Interact                       | E                                    |
| Active floor       | Replay floor checkpoint        | R                                    |
| Active floor       | Generate a new run             | N                                    |
| Runeforge          | Choose / leave / replay / new  | Arrows; 1/2/3 or Enter; Escape; R; N |
| Floor Cleared      | Descend / replay floor / new   | Enter or Space; R; N                 |
| Run victory/defeat | Replay same run / generate new | R; N, Enter, Space; pointer controls |

## Deployment and design documents

Every verified push to `main` runs **Quality** and **Deploy Production**. Deployment uploads only `dist`; there is no `gh-pages` branch or repository `CNAME` file.

- [Three-floor run contract](docs/THREE_FLOOR_RUN.md)
- [Loot and run upgrades](docs/LOOT_AND_UPGRADES.md)
- [Combat and enemies](docs/COMBAT_AND_ENEMIES.md)
- [Escape objective](docs/ESCAPE_OBJECTIVE.md)
- [Dungeon generation](docs/DUNGEON_GENERATION.md)
- [Deployment and rollback](docs/DEPLOYMENT.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Current phase status](docs/PHASE_STATUS.md)
