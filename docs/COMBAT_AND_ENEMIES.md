# Combat and Enemies Contract

## Overview

Phase 4 adds deterministic room encounters and keyboard-first top-down combat around the unchanged Phase 3 escape objective. Pure TypeScript owns encounter planning, fingerprints, validation, facing, melee geometry, attack/dash timing, vitality, knockback, run outcomes, AI decisions, and minimap threat derivation. Phaser owns physics, rendering, bounded effects, input, and scene lifecycle.

Enemies are optional hazards. The Runic Key and Ancient Gate remain usable with living enemies. In the original Phase 4 releases (`v0.4.0` and `v0.4.1`) enemies dropped nothing; Phase 5 attaches a separate deterministic reward plan to their stable IDs.

## Phase 5 integration

Enemy AI, base health, speed, damage, encounter planning, and `ec-xxxxxxxx` meaning remain unchanged. Phase 5 looks up one planned reward by stable enemy ID after the existing single defeat callback and resolves a safe pickup point from the actual death position. Runtime timing or death coordinates never reroll contents or enter the loot fingerprint.

Player upgrades derive an effective player-only configuration without mutating the Phase 4 constants documented below. With no upgrades, every combat value is identical. Tempered Edge, Long Reach, Quickened Steel, Fleet Sigil, Vital Rune, and Aegis Rune affect only their documented player fields. Enemies remain optional, and living enemies still do not block Ancient Gate completion. This later integration does not mean loot existed in either Phase 4 gameplay release.

## Player facing and attack controls

Facing is an explicit normalized vector that begins east `(1, 0)`. Non-zero movement updates it; zero movement preserves it. Invalid or zero vectors fall back safely to the previous valid direction or east. Player rotation uses the same vector.

- <kbd>Space</kbd> or <kbd>J</kbd> attacks along stored facing.
- Left pointer attacks convert the pointer through the active camera into world coordinates, face toward it, and attack.
- Held keyboard inputs use down/up guards and cannot bypass cooldown by browser repeat.
- Overlay pointer input cannot attack because terminal run outcomes disable the combat controller.

## Melee geometry and timing

The sword is a pure inclusive circular-sector test:

| Setting                 |    Value |
| ----------------------- | -------: |
| Damage                  |        1 |
| Range                   |    58 px |
| Full arc                |     110° |
| Wind-up                 |    45 ms |
| Active window           |    80 ms |
| Recovery                |   105 ms |
| Total animation         |   230 ms |
| Start-to-start cooldown |   330 ms |
| Enemy knockback speed   | 210 px/s |
| Enemy knockback         |   120 ms |

Range and arc boundaries are inclusive. Enemy radius extends both range and angular eligibility, while an attack-local ID set permits one hit per enemy and multiple genuine targets per swing. Dead enemies are excluded.

Wall occlusion samples the player-to-target segment every one-quarter tile against the authoritative floor mask. Any sample outside walkable floor rejects the hit, so a visual sword arc never damages through a wall. The arc is a short-lived non-physics graphic that exists only during the active window.

## Dash

<kbd>Shift</kbd> chooses current non-zero movement input, otherwise stored facing, and normalizes it.

| Setting     |    Value |
| ----------- | -------: |
| Speed       | 600 px/s |
| Active time |   130 ms |
| Cooldown    |   900 ms |

Dash velocity overrides ordinary movement but retains the normal player body and generated-wall collider, so it cannot pass through walls. Contact and projectile damage are ignored while active. Dash neither damages enemies nor interacts with key/gate objects. Attack cannot start during dash; accepted damage, terminal outcomes, restart, and shutdown cancel runtime motion. A bounded three-image trail supplies visual feedback.

## Player vitality, damage, and knockback

The immutable vitality model is either alive with coherent timers or defeated at zero health.

| Setting                    |    Value |
| -------------------------- | -------: |
| Maximum and initial health |        5 |
| Contact/projectile damage  |        1 |
| Post-hit invulnerability   |   850 ms |
| Hit stun                   |   130 ms |
| Player knockback speed     | 250 px/s |
| Player knockback duration  |   120 ms |

Accepted damage clamps integer health, starts invulnerability and hit stun, cancels a sword attack, applies finite knockback away from the source, updates the HUD, flashes the player and screen, shakes the camera briefly, and announces remaining health once. Dash or post-hit invulnerability ignores damage without replaying feedback. Physics walls remain active during knockback.

## Run outcomes and terminal behavior

Run outcome is independent from objective state and has exactly three values: `active`, `escaped`, or `defeated`. Only active may transition to either terminal value; terminal transitions are idempotent and mutually exclusive.

Both terminal outcomes freeze timer, player movement, attack, dash, interaction, enemy motion/attacks, projectile creation, and existing projectiles. Escape still requires the Phase 3 key/gate transition but never requires clearing enemies.

At zero health, **Fallen in the Catacombs** shows seed, frozen time, discovered rooms, and defeated enemies. Completion additionally shows remaining health and defeated enemies. Both overlays offer guarded pointer buttons plus:

- <kbd>R</kbd>: replay the same seed;
- <kbd>N</kbd>, <kbd>Enter</kbd>, or <kbd>Space</kbd>: new dungeon.

## Encounter-planning pipeline

Planning consumes an already validated `DungeonLayout` and `EscapeObjectivePlan`:

1. Sort every non-spawn room by stable room ID.
2. Reserve the key room for an Ash Wisp and gate room for a Stone Warden.
3. Reserve the lowest stable remaining room ID for a guaranteed Bone Stalker.
4. Assign remaining rooms with a local derived PRNG and 45% Stalker, 30% Wisp, 25% Warden weights.
5. Search each room's finite tile area in a seed-derived stable order that prefers edge-adjacent safe tiles.
6. Select the first point with one full tile of wall clearance and an inclusive 80-pixel minimum separation from spawn, key, and gate.
7. Create stable IDs ordered by room, derive the encounter fingerprint, and validate the complete plan.

Exactly one enemy exists in every non-spawn room. The 10–14-room generator therefore creates 9–13 enemies. No encounter retry regenerates the dungeon, and no search is unbounded.

## Encounter fingerprint and validation

`ec-xxxxxxxx` hashes encounter contract version, layout fingerprint, objective fingerprint, and ordered enemy ID, archetype, room, tile/world position, and maximum health. It excludes runtime health, actions, frames, dates, browser size, Phaser state, and object identity. Layout and objective fingerprints retain their Phase 2 and Phase 3 meanings.

Validation rejects descriptive errors unless count, per-room coverage, spawn-room exclusion, unique IDs, room existence, finite coordinates, room containment, walkability, clearance, object separation, all-three-archetype guarantees, key/gate assignments, health configuration, and fingerprint recomputation all pass.

## Room-local enemy lifecycle

- Undiscovered: dormant, invisible, physics body disabled.
- Discovered but player outside home room: visible; returns toward planned spawn and never attacks.
- Player inside home room: engages its archetype behavior.
- Defeated: body disabled, shadow/telegraph hidden, and remains dead for the floor.
- Escape, defeat, restart, new dungeon, or shutdown: velocity stops; projectiles, colliders, telegraphs, effects, listeners, and scene-owned objects are cleaned.

Enemy positions are clamped to their home-room interior in addition to generated-wall collision. Phase 4 intentionally has no cross-room pursuit or dungeon-wide pathfinding.

## Bone Stalker

- Health: 2
- Speed: 105 px/s
- Close stop distance: 30 px
- Damage: shared one-point contact damage

The pale, red-eyed Stalker moves directly toward the player only inside its home room, slows at contact distance, and returns directly to spawn after disengagement. It has no random wandering or projectile.

## Ash Wisp and projectiles

- Health: 2
- Speed: 75 px/s
- Preferred range: 150–210 px
- Initial shot delay: 700 ms
- Telegraph: 350 ms
- Shot cooldown: 2,000 ms
- Projectile speed: 190 px/s
- Projectile lifetime: 2,200 ms
- Damage: 1

The Wisp retreats below minimum range, approaches above maximum, and holds between them. Telegraph start locks a normalized direction; release creates one non-homing ember body. Projectiles collide with the shared generated walls, are also defensively checked against the authoritative walkable mask, disappear on any accepted or ignored player contact, expire by monotonic delta, and are destroyed when their owner dies, disengages, or the run/scene ends. This keeps active count bounded.

## Stone Warden

- Health: 4
- Approach speed: 55 px/s
- Charge trigger: 240 px
- Wind-up: 550 ms
- Charge speed: 300 px/s
- Charge duration: 420 ms
- Recovery: 900 ms
- Damage: shared one-point contact damage

The larger Warden follows `idle → approach → wind-up → charge → recover`, with `return` and `dead` terminal branches for room state. Wind-up locks the charge direction. Charge never steers and ends by duration or directional wall impact; a short collision grace prevents an edge-touch callback from canceling the first readable charge frames. Sword damage during wind-up or charge forces recovery. Leaving during wind-up/charge cancels safely into return behavior.

## HUD and minimap

The HUD updates health pips only after health changes, defeated count only after death/reset, dash text only after its visible ready/active/tenth-second state changes, timer once per displayed second, and objective text only on transitions.

Threat derivation is pure and does not mutate discovery. An undiscovered enemy room reveals nothing; a discovered living enemy room shows one stable room-center triangle; death removes it. Spawn has no enemy. Key, gate, and threat markers may coexist and redraw only after discovery, objective state, or enemy alive/dead changes.

## Restart and new dungeon

<kbd>R</kbd> restarts GameScene with the same seed and therefore the same layout, objective, and encounter fingerprints. It restores full health, default east facing, attack readiness, dash readiness, every enemy at full health, no projectiles, no telegraphs, the key, sealed gate, zero timer, spawn-only discovery, and spawn position.

<kbd>N</kbd> creates a friendly seed outside deterministic planning, updates the URL without reloading, and builds fresh layout, objective, encounter, and runtime state. Overlay <kbd>Enter</kbd>/<kbd>Space</kbd> use the same new-dungeon path.

## E2E bridge and production isolation

E2E mode retains `teleportToTarget` and adds only:

- `teleportNearEnemy(enemyId)`: uses normal home-room metadata to choose a validated point inside melee range, clears velocity, and faces the player toward the living enemy;
- `teleportOntoEnemy(enemyId)`: places the normal player on the living enemy body and clears velocity.

Neither action changes health, attacks, cooldowns, objective state, outcome, or enemy state. Playwright must use real input and collision callbacks. Production assets are audited to exclude `__DUNGEON_ESCAPE_E2E__`, `installE2EBridge`, `teleportToTarget`, `teleportNearEnemy`, and `teleportOntoEnemy`.

## Intentionally deferred after Phase 5

Coins, experience, general inventories, equipment, weapon selection, upgrade ranks, levels, skill trees, multiple floors, transitions, bosses, difficulty scaling, traps, audio, pause menus, score, best times, persistence/save games, virtual controls, and network play are not implemented. Phase 5 rewards are run-only and reset with the floor.
