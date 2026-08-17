# Phase Status

## Current release

- **Version:** `v0.5.0`
- **Phase:** Phase 5 — Deterministic Loot and Run Upgrades
- **State:** Implementation complete; release verification pending
- **Canonical production URL:** `https://meiirorazalin.com/`
- **Phase 5 implementation commit:** Pending the verified implementation commit

The release remains on the existing static GitHub Pages architecture: `main` builds with the explicit Vite base `/`, only `dist` is deployed, HTTPS is enforced for `meiirorazalin.com`, and the readiness-gated bridge-free live smoke job follows each deployment. Phase 5 changes gameplay and accurate documentation only; it does not alter DNS, Pages, certificate, analytics, persistence, or backend configuration.

## Completed Phase 5 scope

- A pure `LootPlan` consumes the validated layout, objective, and encounter plans without changing their fingerprints.
- The stable `lt-xxxxxxxx` fingerprint covers ordered forge placement, three ordered Treasure Chests and their contents, every ordered enemy reward, the three unchanged upstream fingerprints, and the upgrade-cost contract.
- Exactly three chests occupy distinct reachable non-spawn, non-key, non-gate rooms. Graph-distance farthest/maximin ranking and bounded safe-tile searches make their rooms and positions reproducible.
- The enemy-free spawn room contains one deterministic, non-blocking Runeforge with a preferred 96-pixel spawn separation.
- Bone Stalkers and Ash Wisps plan 1 shard; Stone Wardens plan 2. Deterministic flask odds are 1/8, 1/5, and 1/3 respectively.
- Each chest contains 2–4 shards. The lowest stable chest ID guarantees a Vitality Flask; every valid floor plans at least 14 shards and at least one flask.
- Runtime drops resolve from the real death point to the closest deterministic safe point inside the home room. One multi-value shard object represents the complete reward.
- Shards auto-collect within an inclusive 28-pixel radius. Flasks restore 2 health only while the living player is injured, clamp to effective maximum health, and remain in the world at full health.
- Immutable reward transitions track available/total shards, opened chests, collected pickups, flask use, selected upgrades, and discriminated forge state.
- The Runeforge costs 6 shards and then 8, offers three distinct deterministic unselected upgrades, and becomes exhausted after two choices.
- The camera-fixed choice overlay supports arrows, 1/2/3, Enter, Escape, pointer hover/selection, and close. While open, a separate `choosing-upgrade` activity state pauses time, movement, combat, enemies, projectiles, loot, and background inputs without changing terminal `RunOutcome`.
- HUD, discovered-only minimap markers, completion statistics, and defeat statistics now include the run-only reward/build state.
- Same-seed replay restores the same four plans and offer sequence with fresh runtime state. New dungeon creates all four new plans and resets base combat, health, loot, chests, forge, and build.

## Upgrade catalog and final constants

Phase 4 base combat values remain immutable. The pure effective-stat model applies at most two unique catalog IDs in stable catalog order:

| Upgrade         | Exact Phase 5 effect                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Tempered Edge   | Melee damage `1 → 2`                                                                                              |
| Long Reach      | Melee range `58 → 76 px`; full arc remains `110°`                                                                 |
| Quickened Steel | Recovery `105 → 75 ms`; start cooldown `330 → 260 ms`; wind-up `45 ms` and active window `80 ms` remain unchanged |
| Fleet Sigil     | Dash cooldown `900 → 650 ms`; speed `600 px/s` and active duration `130 ms` remain unchanged                      |
| Vital Rune      | Maximum health `5 → 6` and restores exactly `1` current health                                                    |
| Aegis Rune      | Post-hit invulnerability `850 → 1,150 ms`; hit stun and damage remain unchanged                                   |

Offers use a local derived PRNG over the loot fingerprint, zero-based offer index, selected IDs in stable order, and catalog contract. `uo-xxxxxxxx` additionally includes the three ordered offered IDs. Neither offers nor selected upgrades alter the loot or upstream planning fingerprints.

## Preserved behavior

- Phase 1 menu, keyboard/pointer input, movement, collision, responsive scaling, and camera behavior
- Phase 2 deterministic 10–14-room layout generation and unchanged layout fingerprint meaning
- Phase 3 Runic Key, Ancient Gate, timer, discovery, minimap, completion, and reset objective behavior
- Phase 4 encounter planning, unchanged encounter fingerprint, three room-local archetypes, sword, dash, damage, defeat, and optional-enemy escape
- v0.4.1 root-relative production build, metadata, Pages workflow, HTTPS redirects, custom domain, audit, E2E-only bridge isolation, and five-test live smoke suite

Loot and upgrades remain optional: unopened chests, uncollected pickups, zero upgrades, and living enemies never block the Ancient Gate.

## Verification record

The implementation has passed the focused development gates while this record awaits the final two-commit release flow:

- `pnpm format:check`: passed
- `pnpm lint`: passed with zero warnings
- `pnpm typecheck`: passed under strict TypeScript
- `pnpm test:run`: 15 files and 257 unit tests passed, including 100 representative valid loot plans
- `pnpm build`: passed with the existing Vite/Phaser production configuration
- `pnpm audit:production`: 47 assertions passed, including all Phase 4 and new Phase 5 bridge identifiers
- `pnpm test:e2e`: the sandboxed command reproduced `listen EPERM` on `127.0.0.1:4173`; the exact unrestricted rerun passed all 30 Chromium tests
- Local visual review: passed at 1440 × 900, 960 × 540, 1024 × 640, and 720 × 700 across menu, chest, pickup, forge, all six cards, selection, exhausted HUD/build, completion, and defeat states, with no page scroll or browser diagnostics
- `pnpm check`: passed all formatting, lint, strict TypeScript, unit, build, and production-audit gates
- Deployment workflows, post-deployment live smoke, and live visual review: pending the implementation push
- Baseline `LIVE_BASE_URL=https://meiirorazalin.com pnpm test:live`: all 5 Chromium tests passed before Phase 5 deployment

The initial sandboxed browser baseline command also reproduced the documented `listen EPERM` condition on `127.0.0.1:4173`; its exact unrestricted rerun passed all 22 pre-Phase-5 Chromium tests. The final expanded suite preserves those tests and adds eight Phase 5 scenarios.

## Production isolation

Production audit scans built text assets for `__DUNGEON_ESCAPE_E2E__`, `installE2EBridge`, `teleportToTarget`, `teleportNearEnemy`, `teleportOntoEnemy`, `teleportToChest`, `teleportToForge`, and `teleportToPickup`. The new actions only position the normal player in E2E mode; they do not grant, open, collect, heal, select, kill, or mutate the objective/outcome.

## Known limitations and deferred work

- The run remains a single keyboard/pointer-first floor; enemies remain room-bound.
- Runic Shards and upgrades are run-only and intentionally reset by both `R` and `N`.
- There is no inventory, equipment, rarity, crafting, shop, experience, character level, persistent progression, save, account, multiple floor, boss, scaling, score, achievement, trap, audio, pause menu, virtual control, analytics, backend, service worker, or offline mode.
- Phase 6 through Phase 8 remain deferred.

## Release intent and historical targets

After final local verification, the implementation will be committed as `feat: add deterministic loot and run upgrades`, deployed and live-verified, then this record will receive the exact commit/workflow evidence. The final verified `main` is intended for annotated tag `v0.5.0`; this document does not invent the release-record commit's own SHA.

- `v0.4.1` → `fdeea817472b3a8c5db41b2d331373a3a97ebe33`
- `v0.4.0` → `b7dd859e6b2106e5f17066d38d55f5bba2514529`
- `v0.3.0` → `bb29079df58b32645278e0843f6cd6ed2966b46e`
- `v0.2.0` → `8f704df17d79cadb26b6e17834075814f1dd11ee`
- `v0.1.0` → `819765fd0d5b5d80c1c3f083700f0f82112deecc`

All published historical tags remain immutable.
