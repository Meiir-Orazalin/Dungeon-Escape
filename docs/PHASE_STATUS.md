# Phase Status

## Current release

- **Version:** `v0.4.0`
- **Current phase:** Phase 4 — Deterministic Enemies and Combat
- **Phase state:** Complete and verified; release commits and publication pending

## Completed Phase 4 requirements

- Pure deterministic encounter planner, `ec-xxxxxxxx` fingerprint, and descriptive validator
- Exactly one enemy in every non-spawn room: 9–13 enemies for the 10–14-room contract
- Inclusive 80-pixel spawn/key/gate separation and one full tile of wall clearance
- Guaranteed Ash Wisp in the key room, Stone Warden at the gate, and Bone Stalker in a third room
- Stable weighted remaining assignments: 45% Stalker, 30% Wisp, 25% Warden
- Room-local dormant, engage, return, idle, and defeated lifecycle
- Directional <kbd>Space</kbd>/<kbd>J</kbd>/pointer sword attacks with wall occlusion and per-swing hit IDs
- Directional <kbd>Shift</kbd> dash with wall collision, cooldown, and temporary damage immunity
- Five-point coherent vitality, one-point contact/projectile damage, hit stun, invulnerability, and knockback
- Bone Stalker pursuit, Ash Wisp spacing/telegraph/projectiles, and Stone Warden wind-up/charge/recovery
- Bounded programmatic slash, trail, damage, impact, enemy, projectile, telegraph, shadow, and defeat visuals
- Independent active/escaped/defeated run-outcome model
- **Fallen in the Catacombs** overlay with keyboard and pointer replay/new controls
- Combat statistics on the existing completion overlay; living enemies never block escape
- Combat-aware health/enemy/dash HUD and discovered-only room threat markers
- E2E-only validated enemy-relative positioning actions with no direct state mutation

## Final tuned constants

| System               | Values                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Sword                | 1 damage; 58 px range; 110° full arc; 45 ms wind-up; 80 ms active; 105 ms recovery; 230 ms total; 330 ms start cooldown |
| Enemy sword response | 210 px/s knockback for 120 ms                                                                                           |
| Dash                 | 600 px/s for 130 ms; 900 ms cooldown                                                                                    |
| Player vitality      | 5 maximum/initial health; 1 damage; 850 ms invulnerability; 130 ms hit stun; 250 px/s knockback for 120 ms              |
| Bone Stalker         | 2 health; 105 px/s; 30 px close stop                                                                                    |
| Ash Wisp             | 2 health; 75 px/s; 150–210 px preferred range; 700 ms initial delay; 350 ms telegraph; 2,000 ms cooldown                |
| Ash projectile       | 190 px/s; 2,200 ms lifetime; 1 damage                                                                                   |
| Stone Warden         | 4 health; 55 px/s; 240 px trigger; 550 ms wind-up; 300 px/s charge for 420 ms; 900 ms recovery                          |

## Preserved Phase 1–3 behavior

- Pointer, Enter, and Space menu start; Space does not leak into an initial attack
- WASD/arrow normalized movement, generated collision, world bounds, camera following, and responsive scaling
- Deterministic 10–14-room generation, connected corridors, URL seeds, structural fingerprint, and safe spawn
- Runic Key, sealed/ready Ancient Gate, guarded <kbd>E</kbd> interaction, objective fingerprint, and timer
- Discovered-room/corridor rules and hidden undiscovered objective rooms
- Ancient Gate completion with a collected key; no enemy-clear requirement
- <kbd>N</kbd> friendly seed and URL update without reload
- Strict TypeScript and the existing Vite, Phaser, Vitest, Playwright, ESLint, Prettier, and Actions setup

## Runtime semantics

- **Room-local AI limitation:** enemies never path through corridors or pursue outside their home room. Leaving cancels attacks/projectiles and sends a living enemy home.
- **Same-seed restart:** <kbd>R</kbd> recreates full health, default facing, attack/dash readiness, all enemies at full health, no projectiles, no defeat count, fresh key/gate/objective state, zero timer, spawn-only discovery, and original spawn while preserving all three fingerprints.
- **Defeat:** zero health transitions active to defeated once, freezes timer and every combat/objective control, stops enemies, destroys projectiles, and waits for an explicit replay or new-dungeon choice.
- **Completion:** valid gate interaction transitions active to escaped once, freezes the same runtime systems, destroys projectiles, and records health/enemy statistics without requiring enemy deaths.
- **New dungeon:** <kbd>N</kbd>, or terminal <kbd>Enter</kbd>/<kbd>Space</kbd>, creates a new seed, layout, objective, encounter plan, and fresh runtime state.

## Deferred requirements

- Phase 5 coins, experience, drops, general loot, chests, potions, healing, inventories, equipment, multiple weapons, and upgrades
- Phase 6 multiple floors, floor transitions, difficulty progression, bosses, complete-run victory, and complete-run defeat
- Phase 7 audio, expanded accessibility/presentation, onboarding, and balancing
- Phase 8 deployment, cross-browser release verification, optimization, and full browser CI
- Traps, environmental damage, pause menus, scores, best times, persistent statistics, save games, virtual controls, and network play

## Verification commands

```bash
pnpm format
pnpm install
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm test:e2e
pnpm check
git diff --check
git status --short
```

The production audit searches built JavaScript for `__DUNGEON_ESCAPE_E2E__`, `installE2EBridge`, `teleportToTarget`, `teleportNearEnemy`, and `teleportOntoEnemy`.

## Final test results

- `pnpm format`: passed; Prettier formatted project source, tests, and documentation.
- `pnpm install`: passed with dependencies synchronized.
- `pnpm install --frozen-lockfile`: passed without lockfile changes.
- `pnpm format:check`: passed.
- `pnpm lint`: passed with zero warnings.
- `pnpm typecheck`: passed under strict TypeScript.
- `pnpm test:run`: passed — 11 files and 205 tests, preserving all 81 Phase 1–3 tests and adding 124 Phase 4 tests.
- Representative encounter batch: 100 deterministic layouts/objectives produced valid encounter plans.
- `pnpm build`: passed with Vite 8.2.1 and Phaser pinned at 4.2.1.
- `pnpm test:e2e`: passed — 22 Chromium tests covering preserved objective regressions and real attack, dash, contact, projectile, charge, escape, defeat, replay, and new-dungeon paths.
- `pnpm check`: passed the formatting, lint, typecheck, unit-test, and production-build gates.
- `git diff --check`: passed.
- Production bridge isolation: passed; all five test-only identifiers were absent from `dist/assets`.
- Browser diagnostics: no page errors, uncaught exceptions, failed local assets, Phaser errors, duplicate input/collider/enemy behavior, stale shadows/projectiles, post-terminal movement/timers/attacks, or restart damage callbacks.
- Visual review: passed at 1440 × 900, 960 × 540, 1024 × 640, and 720 × 700. All archetypes, sword direction, dash/damage feedback, telegraphs, projectile, health, threat markers, objectives, and terminal overlays were readable; page dimensions matched the viewport with no scrolling.

## Known limitations

- Combat and objective progression cover one floor only.
- Enemies are intentionally room-bound and use direct local movement rather than pathfinding.
- One sword is available; there are no weapons, drops, rewards, healing, or progression.
- Completion and defeat statistics are session-only and not scores or records.
- Movement/combat remain keyboard-and-pointer first; virtual controls are deferred.
- Phaser remains the majority of the production JavaScript bundle.
- Full Playwright remains local; CI runs non-browser gates.

## Release references

- **Phase 4 implementation commit:** Pending the first release commit; recorded by the verified-record commit
- **Release intent:** annotated tag `v0.4.0` at the final verified-record commit
- **Remote:** `https://github.com/Meiir-Orazalin/Dungeon-Escape.git`

Published historical releases remain unchanged:

- `v0.3.0` → `bb29079df58b32645278e0843f6cd6ed2966b46e`
- `v0.2.0` → `8f704df17d79cadb26b6e17834075814f1dd11ee`
- `v0.1.0` → `819765fd0d5b5d80c1c3f083700f0f82112deecc`
