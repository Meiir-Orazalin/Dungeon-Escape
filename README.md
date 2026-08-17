# Dungeon Escape

Dungeon Escape is a deterministic dark-fantasy browser action game. Version `v0.5.0` adds deterministic Treasure Chests, enemy rewards, healing, and a two-choice run-build loop while preserving the one-floor escape objective and secure GitHub Pages deployment.

Everything visible is drawn with original programmatic Phaser shapes and textures. The project loads no external art, fonts, runtime CDNs, APIs, analytics, or backend services.

## Play online

Canonical production URL: <https://meiirorazalin.com/>

Fixed-seed example: <https://meiirorazalin.com/?seed=production-smoke>

**Current deployment status:** Live at <https://meiirorazalin.com/>. The apex and `www` hosts use an approved GitHub Pages certificate, plain HTTP redirects to HTTPS, and the bridge-free production smoke suite runs after every deployment.

## Current playable functionality

- Pointer, <kbd>Enter</kbd>, or <kbd>Space</kbd> title-menu start
- Deterministic 72 × 44-tile dungeons with 10–14 rooms and connected three-tile corridors
- One deterministic enemy in every non-spawn room: 9–13 enemies per dungeon
- Bone Stalker melee pursuit, Ash Wisp projectiles, and Stone Warden charges
- Room-local enemy activation and return behavior
- Directional sword attacks with <kbd>Space</kbd>, <kbd>J</kbd>, or camera-correct pointer aim
- Directional, wall-colliding, temporarily invulnerable <kbd>Shift</kbd> dash
- Five-point health, contact/projectile damage, hit stun, knockback, and invulnerability
- Deterministic Runic Key and Ancient Gate objective with <kbd>E</kbd> interaction
- Exactly three deterministic Treasure Chests in distinct optional rooms
- Runic Shards from enemies and chests, plus immediate-use Vitality Flasks
- One safe-room Runeforge with deterministic three-card offers
- Six distinct run upgrades, with at most two purchases costing 6 then 8 shards
- Escaped and defeated overlays with same-seed replay and new-dungeon controls
- Loot-aware HUD and discovered-only minimap objective, threat, chest, and forge markers
- Responsive 960 × 540 canvas over a 2304 × 1408 camera-followed world

Runic Shards and upgrades exist only for the current floor. There is no general inventory or permanent progression. Multiple floors, bosses, traps, equipment, audio, scoring, persistence, virtual controls, and Phase 6 remain deferred.

## Combat, objective, and reset behavior

Explore, fight or evade room-bound enemies, open optional **Treasure Chests**, and collect nearby **Runic Shards**. A **Vitality Flask** heals two points only when injured. Return to the enemy-free spawn room and press <kbd>E</kbd> at the **Runeforge** to spend 6 shards on the first run upgrade and 8 on the second. Each deterministic offer contains three distinct unselected choices from Tempered Edge, Long Reach, Quickened Steel, Fleet Sigil, Vital Rune, and Aegis Rune.

Collect the **Runic Key** with <kbd>E</kbd>, then use <kbd>E</kbd> at the ready **Ancient Gate**. Loot, upgrades, and enemy clearance remain optional. The floor timer and world pause while choosing a forge upgrade and freeze on escape or defeat; terminal overlays show session-only combat and reward statistics rather than a score.

<kbd>R</kbd> performs a full same-seed replay with base health/combat, zero shards, no upgrades or pickups, closed chests, a fresh forge, restored enemies/objective, and zero timer. It preserves the layout, objective, encounter, and loot fingerprints plus deterministic offers. <kbd>N</kbd> creates a new seed and all four fresh plans; <kbd>Enter</kbd> or <kbd>Space</kbd> also creates a new dungeon from a terminal overlay. Chest and threat markers remain hidden until their rooms are discovered.

## Deterministic seed contract

Letters, digits, hyphens, and underscores are preserved. Seeds normalize to lowercase ASCII and are limited to 48 characters. A non-empty `?seed=` reproduces the same layout, objective, encounter plan, loot plan, chest contents, enemy rewards, upgrade offers, and four planning fingerprints in this application version. Without a URL seed, `crypto.getRandomValues` creates a friendly seed outside deterministic generation.

## Technology

- pnpm 11.16.0 and Node.js 24 in deployment workflows
- Vite 8 with an explicit `/` production base
- Vanilla strict TypeScript
- Phaser 4.2.1 with Arcade Physics
- Vitest and Playwright with Chromium
- GitHub Pages deployed by GitHub Actions from `main`
- ESLint and Prettier

## Installation

Prerequisites are Node.js `20.19.0` or newer, or `22.12.0` or newer, and pnpm `11.16.0`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test:e2e:install
```

## Local development

```bash
pnpm dev
```

Open <http://127.0.0.1:5173/>.

## Production build and audit

```bash
pnpm build
pnpm audit:production
pnpm preview
```

The preview is served at <http://127.0.0.1:4173/>. The audit checks production metadata, root-relative assets, image dimensions, manifest data, artifact hygiene, and test-bridge isolation.

Branding assets are committed source assets. Regenerate them intentionally with:

```bash
pnpm assets:generate
```

## Tests and quality checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm test:e2e
pnpm check
```

Run the separate bridge-free production suite with:

```bash
LIVE_BASE_URL=https://meiirorazalin.com pnpm test:live
```

`pnpm check` runs formatting, ESLint, strict TypeScript, unit tests, a production build, and the production audit. Local E2E tests retain their isolated E2E-only bridge; live tests use only public behavior.

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
| Runeforge            | Highlight              | Arrow keys                          |
| Runeforge            | Choose                 | 1, 2, 3, or Enter                   |
| Runeforge            | Leave without purchase | Escape                              |
| Completion or defeat | Replay this seed       | R or **Replay This Seed**           |
| Completion or defeat | Generate a new dungeon | N, Enter, Space, or **New Dungeon** |

## Deployment

Every verified push to `main` runs the **Quality** and **Deploy Production** workflows. Deployment uploads only `dist`; no `gh-pages` branch or repository `CNAME` file is used. Domain, DNS, certificate, rollback, and troubleshooting procedures are documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

See [loot and run upgrades](docs/LOOT_AND_UPGRADES.md), [combat and enemies](docs/COMBAT_AND_ENEMIES.md), [the escape-objective contract](docs/ESCAPE_OBJECTIVE.md), [the generation contract](docs/DUNGEON_GENERATION.md), [the implementation plan](docs/IMPLEMENTATION_PLAN.md), and [the phase status](docs/PHASE_STATUS.md).
