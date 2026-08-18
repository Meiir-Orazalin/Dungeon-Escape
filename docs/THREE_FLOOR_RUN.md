# Complete Deterministic Three-Floor Run

## Phase 6 overview

Phase 6 joins the independently deterministic dungeon, objective, encounter, loot, and upgrade systems into one complete run of exactly three floors. Planning remains pure; Phaser renders only the current precomputed floor. There is no fourth floor, boss, trap, score, save data, or persistent progression.

## Run seed and floor seeds

The single normalized `?seed=` value is the complete run seed. No floor, health, shard, build, or progress query parameter exists. Reloading begins a fresh Floor 1 run.

- Floor 1 uses the normalized run seed exactly.
- Floor 2 uses `f2-<stable-hash>-<short-run-prefix>`.
- Floor 3 uses `f3-<stable-hash>-<short-run-prefix>`.

The hash includes the run seed, floor number, and explicit floor-seed contract version. Derived seeds contain only normalized allowed characters, remain at most 48 characters, and cannot collide through truncation alone. Floor transitions and replay do not change the URL. A new run uses `crypto.getRandomValues` only to create the friendly outer seed before deterministic planning.

## RunPlan and Floor 1 compatibility

`createRunPlan` normalizes the run seed and immediately creates all three immutable `FloorPlanBundle` values. Each bundle contains floor number/seed, theme, difficulty, validated `DungeonLayout`, `EscapeObjectivePlan`, `EncounterPlan`, and `LootPlan`. Future floors never depend on player decisions and are not regenerated during descent.

Floor 1 invokes the unchanged Phase 5 planning chain with the URL seed. Its `dg-`, `eo-`, `ec-`, and `lt-` fingerprints therefore match direct single-floor planning. Floors 2 and 3 independently invoke those same planners with derived seeds. No floor may reference another floor's rooms or positions.

## Run fingerprint and validation

The separate `rn-xxxxxxxx` fingerprint hashes explicitly ordered:

- run/floor-seed contract versions and normalized run seed;
- exactly three floor numbers and seeds;
- ordered theme IDs;
- ordered difficulty IDs and exact numeric values;
- all twelve ordered floor fingerprints;
- one-point transition healing and carry contracts;
- per-floor costs `6, 8`, two-purchase floor maximum, and six-purchase run maximum.

It excludes current floor, health, shards, opened chests, pickups, build choices, offers, runtime enemies, discovery, timers, browser/Phaser state, object identity, date, and time.

The dedicated validator recomputes the run fingerprint, requires ordered floors `1, 2, 3`, checks the documented seed derivation and unique seeds, matches theme/difficulty IDs, invokes every floor subsystem validator with run/floor/subsystem context, requires three chests and at least 14 planned shards per floor, and rejects invalid finite/bounded contracts before any Phaser objects exist. Automated tests validate 100 representative RunPlans and 300 floor bundles.

## Floors and presentation themes

| Floor | Name                   | Theme ID           | Difficulty |
| ----: | ---------------------- | ------------------ | ---------- |
|     1 | THE SHIFTING CATACOMBS | shifting-catacombs | depth-1    |
|     2 | THE EMBER VAULTS       | ember-vaults       | depth-2    |
|     3 | THE OBSIDIAN SANCTUM   | obsidian-sanctum   | depth-3    |

Themes are immutable presentation tokens for void, floor/wall variation, cracks, accents, HUD, gate, forge, and overlays. They do not affect geometry, collision, objectives, enemies, loot, or the four floor fingerprints. Catacombs retain dark stone/amber, Ember Vaults use restrained basalt/copper, and Obsidian Sanctum uses near-black stone with controlled violet/pale runes.

## Difficulty and effective enemy stats

| Value                          | depth-1 | depth-2 | depth-3 |
| ------------------------------ | ------: | ------: | ------: |
| Maximum-health bonus           |       0 |      +1 |      +2 |
| Movement-speed multiplier      |    1.00 |    1.08 |    1.16 |
| Action-cooldown multiplier     |    1.00 |    0.92 |    0.84 |
| Wisp projectile multiplier     |    1.00 |    1.10 |    1.20 |
| Warden charge-speed multiplier |    1.00 |    1.10 |    1.20 |

Effective enemy stats are derived from immutable Phase 4 configuration each floor. Derivation never compounds and does not change `EncounterPlan`. It scales ordinary movement, Wisp initial/cooldown wait, Wisp projectile speed, Warden recovery, and Warden charge speed. Wisp telegraph remains `350 ms`, Warden wind-up remains `550 ms`, all enemy damage remains `1`, and reward amounts remain archetype-based.

## Eight-upgrade catalog and offers

The six Phase 5 upgrades retain their exact effects. Phase 6 adds:

- **Windstep Sigil** (`windstep-sigil`): ordinary player movement multiplier `1.15`; dash speed/duration unchanged.
- **Stalwart Rune** (`stalwart-rune`): hit stun `130 → 90 ms` and player knockback duration `120 → 80 ms`; knockback speed and damage unchanged.

Every ID is one-time. Global selection is limited to six, while each fresh floor forge permits two purchases at `6` then `8` available shards. The offer generator uses current floor loot fingerprint, floor number, floor-local index `0` or `1`, stable global selected IDs, catalog version, and a local deterministic PRNG. It immediately shuffles the eligible catalog and takes exactly three distinct unselected IDs. With eight catalog entries, three cards remain legal for the sixth and final possible purchase after five prior selections. `uo-xxxxxxxx` fingerprints the ordered inputs and offered IDs.

## Carry state and economy

Available shards, total collected shards, current health, and global selected upgrades carry on Continue. A new floor resets opened chests, collected pickup IDs, current-floor flask count, current-floor forge purchases/cost, objective, enemies, pickups, discovery, and minimap. Each floor independently guarantees at least 14 planned shards.

Health carries and receives exactly one transition health after Continue, clamped to the effective maximum. Healing occurs once after the completed summary is committed and cannot revive defeat. Attack, dash, invulnerability, hit stun, knockback, projectiles, and effects never carry; the new floor starts combat-ready. Vital Rune maximum health remains derived from the carried build.

## Session, checkpoints, summaries, and statistics

The immutable session model separates terminal `RunOutcome` (`active`, `escaped`, `defeated`) from active activity (`playing`, `choosing-upgrade`, `floor-cleared`). Only active + playing updates the world and timers.

Every floor begins with an immutable entry checkpoint containing floor number, carried health/economy/build, run elapsed time, cumulative statistics, and prior summaries. Active-run <kbd>R</kbd> restores that checkpoint exactly from normal play, Runeforge selection, or Floor Cleared and recreates the same current floor plan. <kbd>N</kbd> starts a new run from any of those active states. Progress earned on the current attempt is discarded; completed prior floors remain. Floor 1 replay is equivalent to a fresh same-seed run.

A `FloorSummary` contains floor number/seed/name, all four fingerprints, floor time, remaining health, room/enemy/chest counts, floor shards/flasks/upgrades, available shards, and global build. Floors 1 and 2 create a provisional summary when the gate opens; only guarded Continue commits it. Duplicate Continue is inert. Floor 3 commits its final summary once on victory. Defeat shows current-attempt statistics but does not mark an unfinished floor complete.

Cumulative run statistics track completed-floor enemies, rooms, chests, shards, flasks, upgrades, accepted damage, and ordered summaries. Nothing persists after the run.

## Floor Cleared, Continue, timers, victory, and defeat

Floor 1/2 gate completion keeps outcome active, enters `floor-cleared`, freezes world/input/pickups/projectiles and both timers, and shows **FLOOR CLEARED**. Enter/Space or **Descend Deeper** commits once, applies one transition health once, creates the next checkpoint, destroys old floor runtime, and renders the already-planned next bundle. <kbd>R</kbd> replays the checkpoint; <kbd>N</kbd> creates a new Floor 1 run.

Floor time resets at each entry. Run time starts at zero and carries. Both use scene delta and freeze behind Runeforge, Floor Cleared, victory, and defeat. Current-floor replay restores the checkpoint run time; terminal replay resets both to zero.

The third gate transitions outcome once to `escaped`, commits the third summary, and displays **DUNGEON CONQUERED** with three floor times and cumulative statistics. Zero health on any floor transitions once to `defeated` and displays **FALLEN IN THE DEPTHS**. Terminal <kbd>R</kbd> restarts the complete same-seed RunPlan at Floor 1; <kbd>N</kbd>, Enter, Space, or the pointer control begins a new run. No fourth floor or current-floor retry exists after defeat.

## HUD and minimap

The HUD displays floor name/indicator, run seed, objective/key, floor and run time, health, current-floor enemy/room/chest state, carried shards with current cost, floor forge purchases `/ 2`, global build `/ 6`, dash, and controls. Timer and state text update only on meaningful display changes.

The minimap represents only the current floor. Descent resets discovery to the new spawn room and recreates current-floor objective, threat, chest, and forge markers with theme accents. Prior/future floors and pickups never appear.

## E2E bridge and production isolation

E2E snapshots add run seed/fingerprint, three ordered floor summaries, current floor/theme/difficulty, both timers, activity/outcome/overlays, checkpoint, carry, current/cumulative statistics, effective depth values, and Windstep/Stalwart player values. Existing actions only position the normal player at real objectives, enemies, chests, forge, or pickups. There is no direct floor advance, outcome, health, shard, upgrade, checkpoint, timer, or objective mutation; Playwright presses real <kbd>E</kbd> and overlay controls.

The bridge remains dynamically imported only in E2E mode. Production audit scans all historical bridge globals/installation/teleport identifiers, while legitimate production terms such as RunPlan, floor, checkpoint, theme, and difficulty are allowed.

## Intentionally deferred

Phase 6 does not add a fourth floor, boss, arena, traps, audio/music, cinematics, equipment, inventory, shops, crafting, rarity/affixes, experience/levels, skill trees, permanent progression, localStorage, save/resume links, scores, leaderboards, achievements, daily runs, pause menus, virtual mobile controls, accounts, services, analytics, offline support, or multiplayer.

## Phase 7 integration

Phase 7 does not change `RunPlan`, floor-seed derivation, the run fingerprint, or any of the twelve ordered floor-planning fingerprints. Floor themes now also select one locally generated ambience identity, but audio is presentation-only and never enters planning.

Escape Pause and automatic focus-loss pause suspend the exact current runtime without changing carry state, the floor-entry checkpoint, statistics, or timers. Presentation settings and onboarding completion may persist locally; run seed progress, floor, health, shards, upgrades, objectives, and timers still do not. The three depth profiles remain exact, and Phase 7 adds no fourth floor or boss.
