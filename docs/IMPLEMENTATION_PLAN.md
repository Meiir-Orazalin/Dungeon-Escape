# Dungeon Escape Implementation Plan

Dungeon Escape is planned as eight incremental phases. Each phase must preserve the verified behaviour of earlier phases, and only the phase explicitly requested is in scope at any one time.

## Phase 1 — Foundation and movement

**Status: Complete**

Establish the pnpm, Vite, strict TypeScript, and Phaser project; create the responsive page shell, Boot/Menu/Game scene flow, one handcrafted room, normalized keyboard movement, collision geometry, restart behaviour, automated quality gates, browser smoke tests, and project documentation.

## Phase 2 — Dungeon generation

**Status: Complete**

Replace the single handcrafted layout with deterministic room-and-corridor generation. Add generation validation, reproducible URL seeds, navigability checks, safe graph-diameter spawn placement, generated collision, new-dungeon controls, discovered-room minimap behavior, and structural test coverage without introducing objectives or combat.

## Phase 3 — Escape objective

**Status: Complete**

Add the first complete one-floor objective loop: deterministically place and collect the Runic Key, activate the Ancient Gate from Phase 2 destination metadata, communicate progress, time the floor, complete the escape, and replay the same seed or generate a new dungeon. Enemies, combat, loot, upgrades, and multiple floors remain deferred.

## Phase 4 — Enemies and combat

**Status: Complete**

Add deterministic one-per-non-spawn-room encounters, Bone Stalker pursuit, Ash Wisp projectiles, Stone Warden charges, directional sword attacks, a wall-colliding dash, five-point health, damage feedback, player defeat, and complete same-seed/new-dungeon reset flows. Enemies remain room-bound and optional to the escape objective; loot, upgrades, multiple floors, bosses, audio, and persistence remain deferred.

## v0.4.1 milestone — Public web deployment

**Status: Complete, verified, deployed, and published**

Publish the unchanged Phase 4 game as a root-hosted GitHub Pages site. Add canonical metadata, original generated branding assets, a production artifact audit, pinned GitHub Actions deployment, separate bridge-free live smoke tests, custom-domain configuration, DNS/HTTPS procedures, and non-destructive rollback documentation. This milestone adds no gameplay and does not begin Phase 5.

## Phase 5 — Loot and upgrades

**Status: Complete**

Add three deterministic Treasure Chests, stable enemy reward assignments, Runic Shards, immediate-use Vitality Flasks, one safe-room Runeforge, six deterministic upgrade choices, and a maximum two-upgrade run build costing 6 then 8 shards. Same-seed and new-dungeon resets erase all runtime rewards and upgrades without adding an inventory or persistence.

## Phase 6 — Complete three-floor run

**Status: Complete**

Connect generation, objectives, combat, loot, and upgrades into exactly three deterministic floors: The Shifting Catacombs, Ember Vaults, and Obsidian Sanctum. Add versioned floor-seed derivation, a validated `RunPlan` and run fingerprint, floor themes, exact depth difficulty profiles, Floor Cleared transitions, health/shard/upgrade carry, one-point transition healing, floor-entry checkpoint replay, cumulative statistics, run victory, and whole-run defeat. Expand the catalog to eight upgrades while retaining three-card offers, two purchases per floor, and a six-purchase run maximum.

## Phase 7 — Presentation and balancing

**Status: Complete — current release scope**

Polish the complete run with original locally generated ambience/effects, safe audio lifecycle, versioned presentation settings, first-run Field Manual, true runtime-preserving Pause and focus-loss pause, fullscreen, reduced motion, shake control, high contrast, large text, enemy health bars, low-health feedback, responsive modal presentation, bounded effects, and explicit Phaser/application bundle separation. Add only one balance adjustment: an exact one-time 450 ms first-discovery enemy awakening window, without changing enemy stats, floor profiles, damage, telegraphs, deterministic plans, rewards, or run rules.

## Phase 8 — Production release

**Status: Deferred**

Complete cross-browser verification, final production optimization and budgets, release hardening, CI browser expansion, final versioning, and a reproducible public release build.
