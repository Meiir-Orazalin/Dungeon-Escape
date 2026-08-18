# Loot and Run Upgrades Contract

## Phase 5 overview

Phase 5 adds a deterministic, optional reward loop around the existing one-floor action escape. Enemies and exactly three Treasure Chests yield Runic Shards and occasional Vitality Flasks. The player may return to the enemy-free spawn room, spend 6 then 8 shards at the Runeforge, and select at most two upgrades for the current floor. Loot never gates the Runic Key or Ancient Gate, and every reward/build value resets on replay or a new dungeon.

Planning, validation, fingerprinting, safe placement, reward transitions, offer generation, healing, effective stats, interaction ranking, and minimap marker derivation are pure TypeScript. Phaser entities render and animate chests, pickups, and the forge; `LootManager` coordinates runtime state while `GameScene` remains the run orchestrator.

## Core reward loop

1. Defeat optional room enemies or press <kbd>E</kbd> at optional Treasure Chests.
2. Move within the inclusive 28-pixel radius of a Runic Shard pickup to collect its complete integer value.
3. Move within the same radius of a Vitality Flask while injured to heal two points; at full health it remains in the world.
4. Return to the spawn-room Runeforge and press <kbd>E</kbd>.
5. Spend 6 shards for the first upgrade and 8 additional shards for the second.
6. Continue exploring or escape; neither upgrade is required.

Runic Shards are a counter, not an inventory. Flasks are immediate world pickups, never stored consumables.

## LootPlan inputs, outputs, and fingerprint

`createLootPlan` consumes the validated `DungeonLayout`, `EscapeObjectivePlan`, and `EncounterPlan`. Its read-only output contains `lt-xxxxxxxx`, one forge plan, three chest plans, one reward per stable enemy ID, total planned shards, and guaranteed flask count. No Phaser object enters the plan.

The loot fingerprint hashes an explicitly ordered contract:

- loot and upgrade-cost contract versions;
- unchanged layout, objective, and encounter fingerprints;
- forge room and tile/world point;
- chest IDs, rooms, tile/world points, shard values, and flask flags ordered by stable ID; and
- enemy IDs, shard values, and flask flags ordered by stable ID.

It excludes health, runtime death positions, frame timing, opened/collected state, selected upgrades, browser state, dates, object identity, and JavaScript object-key order. Phase 5 does not change `dg-xxxxxxxx`, `eo-xxxxxxxx`, or `ec-xxxxxxxx` meanings.

## Chest-room selection

Spawn, key, and gate rooms are excluded. Remaining rooms are sorted by ascending ID and must be reachable. The first chest uses greatest graph distance from spawn, then ascending ID. Each later chest applies greedy maximin ranking:

1. greatest minimum graph distance from selected chest rooms;
2. greatest graph distance from spawn;
3. greatest minimum squared geometric separation from selected chest-room centers; and
4. ascending room ID.

The finite candidate list is evaluated without retries or random iteration. Fewer than three eligible rooms fails descriptively.

## Safe chest and forge placement

Each chest searches only its declared room. Candidates require walkable floor and one full surrounding walkable tile. Ranking prefers greatest squared distance from that room's planned enemy and then visual proximity to the room center; the accepted boundary is an inclusive 80 pixels from the enemy. Spawn, key, and gate points cannot overlap a chest.

The Runeforge uses the same wall-clearance rule in `layout.spawnRoomId`. Candidates prefer greatest separation from the player spawn, with an inclusive 96-pixel preference when room geometry permits and a deterministic non-overlapping fallback for smaller rooms. Neither chest nor forge has a blocking body, so the existing inclusive 52-pixel interaction radius remains approachable.

Validation recomputes the fingerprint and checks all room, count, ID, finite-coordinate, containment, walkability, wall-clearance, exclusion, enemy-separation, reward, total, and flask invariants before anything renders. Invalid planning throws `LootPlanningError`; GameScene announces a concise failure and returns safely to the menu without partial loot objects.

## Reward contracts

Enemy shard values are fixed by the existing archetype:

| Enemy        | Shards | Flask probability |
| ------------ | -----: | ----------------: |
| Bone Stalker |      1 |               1/8 |
| Ash Wisp     |      1 |               1/5 |
| Stone Warden |      2 |               1/3 |

Each flask roll uses a local PRNG derived from loot contract version, encounter fingerprint, and stable enemy ID. Death time and location never reroll it. One enemy creates at most one multi-value shard object and one flask.

Each chest contains a deterministic 2–4 shards and zero or one flask. The lowest stable chest ID always contains a flask; other chest flask flags use the plan-local PRNG. Enemy minimum values plus three chest minimum values guarantee at least 14 planned shards for the 6 + 8 cost contract. At least one flask is always guaranteed.

## Runtime safe-drop resolution

Enemy contents come from the plan, but position begins at the actual death point. A finite point is preserved when it is walkable, in the enemy's home room, and has the same one-tile clearance. Otherwise every safe tile in that home room is ranked by squared distance from death, then tile Y and X. The bounded search returns the closest deterministic tile center or fails descriptively; runtime coordinates never alter `lt-xxxxxxxx`.

Chest and enemy sources are idempotent. Their rewards emit once. New pickups are armed only after the player has first been outside their 28-pixel radius, preventing chest opening itself from collecting contents. Pickups do not block movement, take sword/projectile damage, or appear on the minimap. Bounded bob, burst, collection, and healing effects own their tweens and clean up at terminal state, restart, or shutdown.

## Healing contract

Vitality healing is pure and defensive. A positive finite amount restores up to current maximum health, reports actual restored health and whether the flask should be consumed, preserves hit/invulnerability timers, cannot exceed maximum, and cannot revive `defeated`. Full-health overlap consumes nothing and produces no repeated feedback. A successful Phase 5 flask restores 2, updates the event-driven HUD, destroys once, shows a restrained green effect, and announces the resulting health once.

## Reward and forge state

The immutable `RunRewardState` holds available and total-collected shards, opened chest IDs, collected pickup IDs, flasks consumed, stable selected upgrade IDs, and a discriminated forge state: `dormant`, `ready`, `choosing`, or `exhausted`. Pure transitions make shard collection, chest opening, and pickup consumption idempotent.

The first cost is 6 and the second is 8. Reaching a boundary changes dormant to ready and announces once; it never opens automatically. Opening or closing an offer spends nothing. A valid offered, unselected upgrade spends the exact current cost. After two choices the forge is exhausted, becomes visually quiet, leaves the interaction list, and cannot spend more shards.

## Upgrade catalog and effective stats

Exactly six stable IDs exist:

| Upgrade         | Effect                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------- |
| Tempered Edge   | Melee damage 1 → 2                                                                          |
| Long Reach      | Melee range 58 → 76 px; 110° arc unchanged                                                  |
| Quickened Steel | Recovery 105 → 75 ms; start cooldown 330 → 260 ms; 45 ms wind-up and 80 ms active unchanged |
| Fleet Sigil     | Dash cooldown 900 → 650 ms; 600 px/s and 130 ms active unchanged                            |
| Vital Rune      | Maximum health 5 → 6 and restore exactly 1 current health                                   |
| Aegis Rune      | Post-hit invulnerability 850 → 1,150 ms; damage and hit stun unchanged                      |

The pure effective-stat derivation starts from immutable Phase 4 constants, sorts unique IDs by catalog order, accepts at most two, rejects unknown/duplicates, and validates positive finite numbers and coherent attack/dash timing. Runtime combat reads the result; enemy values and all planning fingerprints remain unchanged. Fleet Sigil clamps remaining cooldown to 650 rather than granting an arbitrary ready dash. Vital Rune does not fully heal or resurrect.

## Deterministic offers

Offer input is loot fingerprint, zero-based offer index, stable selected IDs, and catalog version. A local derived PRNG performs one bounded shuffle of unselected catalog IDs and takes the first three. Every offer is immediately three distinct unselected upgrades.

`uo-xxxxxxxx` hashes catalog version, loot fingerprint, offer index, selected IDs in catalog order, and offered IDs in display order. The first offer therefore reappears on same-seed replay; the second is derived from the first selection. Runtime selection never changes the LootPlan fingerprint.

## Interaction and overlay

General <kbd>E</kbd> targeting uses squared distance and the inclusive 52-pixel boundary. Nearest wins; an exact tie uses key, gate, closed chest, forge, then stable ID. Closed chests show `E · OPEN TREASURE CHEST`. Forge text is `INSPECT` below cost and `AWAKEN` when ready.

The camera-fixed Runeforge overlay offers hover/click cards, arrows to highlight, <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> direct choice, <kbd>Enter</kbd> confirmation, and <kbd>Escape</kbd> without purchase. Space and J never select. Activity is separate from terminal `RunOutcome`: `active + playing` updates time/world; `active + choosing-upgrade` freezes player velocity, combat, enemy/projectile activity, pickups, interactions, and timer. R, N, E, attack, dash, and movement cannot act behind it. Close resumes the same run; selection recomputes effective stats and resumes without changing position, objective, enemies, discovery, chests, or pickups.

## HUD, minimap, and terminal statistics

The HUD adds event-driven `SHARDS`, `CHESTS`, `RUNES`, and compact `BUILD` fields. It shows the next cost, then `RUNES · COMPLETE` after two upgrades. Existing timer, health, dash, enemy, seed, objective, and room fields retain their bounded update rules.

The spawn-room forge marker is visible immediately and changes dormant/ready/exhausted. A closed chest marker appears only after its room is discovered and disappears when opened. Pickups never appear. Loot markers coexist deterministically with objective and living-threat markers and redraw only after relevant state changes.

Escape and defeat overlays add total and available shards, chests opened, selected count/build names. Remaining loot freezes. Escape still permits unopened chests, zero shards, zero upgrades, and living enemies.

## Reset and new-dungeon semantics

<kbd>R</kbd> preserves seed and all four plan fingerprints, chest rooms/contents, enemy assignments, and first offer. It restores base health/effective stats, closed chests, fresh enemies and objective, zero shards, no upgrades/pickups/flask history, first forge cost, zero timer, spawn-only discovery, and base combat/dash state.

<kbd>N</kbd> creates a friendly seed and fresh layout, objective, encounter, loot, fingerprint, placements, contents, assignments, and offer sequence, again with empty runtime state. Scene shutdown removes entities, effects, overlaps/update paths, and overlay listeners so repeated R/N cannot accumulate stale objects or handlers.

## E2E bridge and production isolation

E2E snapshots add the loot fingerprint, forge/chest/pickup/reward summaries, reward state, offer/fingerprint, selected IDs, and effective stats. Three narrow positioning actions exist only in E2E mode:

- `teleportToChest(chestId)` positions the normal player at an existing closed chest; real <kbd>E</kbd> opens it.
- `teleportToForge()` positions the normal player at the available forge; real <kbd>E</kbd> inspects or opens it.
- `teleportToPickup(pickupId)` positions the normal player at an active pickup; real proximity logic decides collection/healing.

They cannot grant shards, heal, open, spawn, collect, select, kill, mutate objective/outcome, or bypass cooldowns. Production audit scanning excludes these identifiers plus every Phase 4 bridge identifier and installation global from `dist`.

## Phase 6 integration

The published Phase 5 contract was deliberately one-floor: its available shards, six-upgrade catalog, at-most-two build, and all loot state ended with that floor. Phase 6 layers cross-floor run state around the unchanged per-floor `LootPlan`:

- every floor creates a new deterministic plan with three fresh chests, enemy assignments, pickups, and safe-room forge;
- available shards and globally selected upgrades carry between floors;
- total collected shards accumulate, while opened chest IDs, collected pickup IDs, flask count, and forge purchases reset at floor entry;
- every fresh forge starts at cost `6`, then costs `8`, and exhausts after two purchases for that floor;
- the global build supports at most six one-time selections;
- current-floor replay restores the floor-entry economy/build and discards upgrades bought on that attempt;
- Phase 6 permits <kbd>R</kbd> checkpoint replay and <kbd>N</kbd> new-run generation while the Runeforge overlay is open; combat, movement, interaction, and all other world input remain suspended;
- the catalog expands from six to eight with Windstep Sigil and Stalwart Rune, while all six original effects remain exact; and
- deterministic offers include floor number, floor-local index, current-floor loot fingerprint, and stable global selected IDs, preserving three legal cards through the sixth possible choice.

This later carry behavior does not retroactively change v0.5.0. Loot remains optional to every key/gate objective, and no inventory or persistence was added. See [THREE_FLOOR_RUN.md](THREE_FLOOR_RUN.md).

## Intentionally deferred after Phase 6

There is no inventory, equipment, rarity, affixes, weapon selection, crafting, vendor/shop, experience, level, skill tree, persistence, save, account, boss, trap, score, achievement, daily run, audio, pause menu, virtual control, analytics, backend, service worker, offline mode, or network system.
