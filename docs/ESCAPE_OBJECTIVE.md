# Escape Objective Contract

## Overview

Phase 3 turns one deterministic Phase 2 dungeon into a complete single-floor escape loop. The player finds and takes a Runic Key, reaches the Ancient Gate, and interacts with the ready gate to complete the floor. Objective planning, validation, state transitions, proximity rules, marker derivation, and time formatting remain pure TypeScript; Phaser owns rendering, input, feedback, and scene lifecycle.

No general inventory, scoring, persistence, or multi-floor system is introduced by the objective contract.

### Cross-phase use in Phase 4

Phase 3 created and published the one-floor key-and-gate objective without combat. Phase 4 adds deterministic enemies, player health, and defeat around that unchanged objective plan. Enemies do not change `eo-xxxxxxxx`, may all be evaded, and never gate Ancient Gate completion. Their later integration does not retroactively make enemies part of the Phase 3 release.

## Planning pipeline

Objective planning consumes an already generated and validated `DungeonLayout`:

1. Build sorted graph adjacency from `layout.connections`.
2. Calculate unweighted shortest-path distances from the spawn room and destination room.
3. Exclude both endpoint rooms from key candidates.
4. Select a deterministic third room using the graph-distance ranking below.
5. Search the selected room's tiles from its center outward for a clear key point.
6. Use `layout.destinationRoomId` and `layout.destination` unchanged for the Ancient Gate.
7. Derive a compact objective fingerprint.
8. Validate every objective invariant before creating Phaser objects.

There are no retries or random choices in objective planning. The same layout always produces deeply equivalent objective data in version `v0.3.0`.

## Key-room ranking

Candidates reachable from both endpoints are ranked by:

1. Prefer rooms at least two graph edges from both spawn and gate when any qualify.
2. Highest minimum of spawn distance and gate distance.
3. Highest sum of those two distances.
4. Greatest summed squared geometric separation from the two endpoint centers.
5. Ascending room ID as the final stable tie-breaker.

If no candidate satisfies the preferred two-edge threshold, the same ordering is applied to every valid distinct candidate. Sorted graph neighbors and explicit room IDs prevent iteration or object-key order from affecting the result.

## Safe key placement

The selected room's tiles are ordered by squared distance from its center, then ascending tile Y and X. The first walkable tile with one full surrounding tile of walkable clearance becomes the Runic Key point. Current room sizes normally select the center immediately, while the bounded room-area search keeps the rule robust and deterministic.

World coordinates always equal the selected tile center. The key has no collision body, so the player can enter its interaction area.

## Ancient Gate destination

The Ancient Gate uses `layout.destinationRoomId` and `layout.destination` exactly. It does not select a second exit or alter the Phase 2 layout fingerprint. The gate is a non-colliding objective presentation at the validated destination-room center.

## Objective fingerprint

The `eo-xxxxxxxx` fingerprint hashes an explicitly ordered contract containing:

- objective contract version;
- Phase 2 layout fingerprint;
- key room ID and tile/world coordinates; and
- gate room ID and tile/world coordinates.

It is independent of elapsed time, dates, browser dimensions, Phaser state, object identity, and JavaScript object-key ordering.

## Validation invariants

The pure validator reports descriptive errors unless all of these are true:

- key and gate rooms exist;
- key room differs from spawn and gate;
- gate room and point exactly use Phase 2 destination metadata;
- key and gate coordinates are finite and match tile centers;
- both points are walkable and inside their declared rooms;
- both points have one full tile of wall clearance;
- the key is reachable from spawn;
- the gate is reachable from spawn and from the key room;
- the fingerprint matches the `eo-xxxxxxxx` contract; and
- the 52-pixel interaction radius is compatible with the 24-pixel player body and 96-pixel corridors.

An invalid plan throws `EscapeObjectivePlanningError` with the layout fingerprint and validation reasons. GameScene fails safely to the menu with a concise player announcement rather than rendering partial objective state.

## Objective state machine

The immutable discriminated state has only three valid forms:

- `seeking-key`
- `key-collected`
- `completed`, with frozen `completionTimeMs`

Transitions are pure:

| Current state | Action           | Result                               |
| ------------- | ---------------- | ------------------------------------ |
| seeking-key   | collect-key      | key-collected                        |
| seeking-key   | attempt-gate     | blocked outcome; state unchanged     |
| key-collected | collect-key      | ignored                              |
| key-collected | attempt-gate     | completed with supplied elapsed time |
| completed     | objective action | ignored                              |
| any           | reset            | seeking-key                          |

Presentation effects consume reducer outcomes; the reducer never creates Phaser objects or contradictory booleans.

## Interaction contract

The inclusive interaction boundary is 52 pixels. Squared-distance comparisons avoid square roots. Available targets are ordered by distance, with the Runic Key before the Ancient Gate as a stable exact-distance tie-breaker.

The <kbd>E</kbd> key has an explicit held-key guard, so browser repeat events cannot trigger repeated blocked reactions or collection. Prompt text is camera-fixed and changes only when its target changes:

- `E  ·  TAKE RUNIC KEY`
- `E  ·  INSPECT SEALED GATE`
- `E  ·  OPEN ANCIENT GATE`

## Gate and key feedback

The Runic Key uses a programmatic amber rune, pedestal, and one bounded pulse tween. Collection stops that tween and deactivates the object.

The Ancient Gate uses a stone circle and generated runes. A sealed red state gives a short muted pulse and announces that the Runic Key is required. Collection changes the same gate to a teal ready state. Completion stops movement, clears prompts, freezes time, and plays a short gate/camera flash before the result overlay.

## Restart and new dungeon semantics

During active play or completion, <kbd>R</kbd> restarts GameScene with the same seed. This intentionally extends Phase 2's position-only reset. It preserves layout and objective fingerprints while restoring seeking-key state, the key, sealed gate, zero timer, spawn position, and spawn-only discovery.

<kbd>N</kbd> uses the existing `crypto.getRandomValues` friendly-seed function, restarts GameScene, updates the URL without reloading, and derives a fresh deterministic dungeon and objective plan. Shutdown handlers remove scene and overlay listeners; scene-owned bodies, tweens, objects, prompts, and timers are recreated cleanly.

## Timer behavior

The floor timer begins at zero and accumulates Phaser's monotonic update delta only while the floor is active. HUD text changes only when the displayed whole second changes. Successful gate interaction stores the current milliseconds in the completed state; subsequent frames and movement do not change it.

Formatting is pure `MM:SS`. Minutes may exceed 59, and negative or non-finite values defensively display `00:00`. Timing is session-only and is never persisted or scored.

## Minimap objective markers

Existing room and corridor discovery is unchanged. Objective marker derivation does not mutate discovery:

- an undiscovered key room has no marker;
- a discovered, uncollected key room shows an amber marker;
- collection removes the key marker;
- an undiscovered gate room has no marker;
- a discovered locked gate shows a sealed red marker; and
- a discovered ready gate shows a teal marker.

The minimap redraws only after room discovery/current-room or objective state changes.

## Completion overlay

The camera-fixed overlay keeps the dungeon behind a dark veil and shows **Dungeon Escaped**, seed, frozen completion time, discovered rooms, remaining health, and enemies defeated. The last two statistics are Phase 4 session information, not score. Controls are:

- <kbd>R</kbd> or **Replay This Seed**: same-seed fresh floor;
- <kbd>N</kbd>, <kbd>Enter</kbd>, <kbd>Space</kbd>, or **New Dungeon**: new seed and floor.

Camera-fixed input zones provide pointer hover, pressed feedback, and guarded single activation. World movement and interaction remain disabled behind the overlay.

## E2E bridge and production isolation

E2E mode exposes read-only objective state plus one narrow objective action: `teleportToTarget("spawn" | "key" | "gate")`. It moves the normal named player body to a normal named target and clears velocity. Phase 4 adds separately constrained enemy-relative actions documented in `COMBAT_AND_ENEMIES.md`. None can supply arbitrary coordinates or mutate objective/combat state; Playwright must still press <kbd>E</kbd> through the real interaction path.

The bridge is dynamically imported only in Vite E2E mode. Production assets are audited to exclude `__DUNGEON_ESCAPE_E2E__`, `installE2EBridge`, and `teleportToTarget`.

## Intentionally deferred

Traps, coins, treasure chests, potions, general loot, inventory screens, equipment, upgrades, multiple weapons, multiple floors, difficulty scaling, bosses, scoring, best times, persistent progression, audio, and virtual mobile movement remain later-phase work.
