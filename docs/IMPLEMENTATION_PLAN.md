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

**Status: Deferred**

Add collectible rewards and a concise set of meaningful run upgrades. Define drop rules and upgrade effects with tests while avoiding an oversized inventory system.

## Phase 6 — Complete three-floor run

**Status: Deferred**

Connect generation, objectives, combat, and upgrades into a complete three-floor run. Add floor transitions, difficulty progression, run victory, run defeat, and reliable state reset.

## Phase 7 — Presentation and balancing

**Status: Deferred**

Refine visual feedback, audio, onboarding, accessibility, performance, encounter pacing, difficulty, rewards, and responsive behaviour. Replace temporary presentation only where the replacement is original and locally owned.

## Phase 8 — Production release

**Status: Deferred**

Complete cross-browser verification, production optimization, deployment configuration, release documentation, CI browser coverage, final versioning, and a reproducible public release build.
