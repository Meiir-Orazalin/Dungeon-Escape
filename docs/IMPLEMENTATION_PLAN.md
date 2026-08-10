# Dungeon Escape Implementation Plan

Dungeon Escape is planned as eight incremental phases. Each phase must preserve the verified behaviour of earlier phases, and only the phase explicitly requested is in scope at any one time.

## Phase 1 — Foundation and movement

**Status: Current implementation scope**

Establish the pnpm, Vite, strict TypeScript, and Phaser project; create the responsive page shell, Boot/Menu/Game scene flow, one handcrafted room, normalized keyboard movement, collision geometry, restart behaviour, automated quality gates, browser smoke tests, and project documentation.

## Phase 2 — Dungeon generation

**Status: Deferred**

Replace the single handcrafted layout with deterministic room-and-corridor generation. Add generation validation, reproducible seeds, navigability checks, safe spawn placement, and test coverage without introducing objectives or combat.

## Phase 3 — Escape objective

**Status: Deferred**

Add the first complete objective loop: locate what is needed to unlock an exit, communicate progress clearly, reach the exit, and complete or restart the floor. Preserve deterministic and reachable placement.

## Phase 4 — Enemies and combat

**Status: Deferred**

Introduce a small enemy roster, readable enemy behaviour, player health, attacks, damage feedback, defeat, and restart flows. Balance clarity and collision correctness before increasing encounter density.

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
