# Phase Status

## Current release

- **Version:** `v0.2.0`
- **Current phase:** Phase 2 — Deterministic Procedural Dungeon Generation
- **Phase state:** Complete and verified; release tag and push pending

## Completed Phase 2 requirements

- Pure seeded generation independent of Phaser
- Stable seed normalization, 32-bit hashing, attempt derivation, and local deterministic PRNG
- URL seed loading and normalized `history.replaceState` synchronization
- Friendly browser-generated seeds using `crypto.getRandomValues`
- Bounded placement of 10–14 non-overlapping rooms with stable IDs and two-tile padding
- Connected distance-weighted room graph using a Kruskal minimum spanning tree
- One to three deterministic extra edges for loops
- Three-tile orthogonal corridors with deterministic orientation and unrelated-room intersection scoring
- Fully connected floor and boundary-wall masks
- Graph-diameter endpoint selection for safe spawn and future destination metadata
- Dedicated validation with descriptive invariant errors and at most 32 deterministic attempts
- Stable compact layout fingerprint computed once per generation
- Dynamic 2304 × 1408 physics world and camera bounds from the generated layout
- Wall rendering and vertically merged Arcade Physics collision rectangles from the same wall mask
- Deterministic floor variation, cracks, and a bounded shared-tween torch set
- <kbd>R</kbd> exact same-seed, same-layout spawn reset
- Guarded <kbd>N</kbd> new-seed scene regeneration with listener cleanup
- Concise seed, controls, and discovered-room HUD
- Camera-fixed discovered-room minimap with current-room state
- Minimal E2E-only bridge exposing stable Phase 2 state while remaining absent from production

## Preserved Phase 1 requirements

- Intentional title menu and page shell
- Enter, Space, pointer, and tap-compatible menu start
- WASD and arrow-key movement
- Simultaneous input and normalized diagonal velocity
- Release-to-stop movement and retained facing direction
- Solid Arcade Physics collision and world containment
- Responsive centered 960 × 540 logical canvas with no accidental page scrolling
- Strict TypeScript, ESLint, Prettier, Vitest, Playwright, Vite build, and GitHub Actions checks

## Deferred requirements

- Phase 3 actionable escape objective and floor-completion loop
- Keys or a rendered/functional exit
- Phase 4 enemies, combat, health, damage, or traps
- Phase 5 loot, chests, potions, or upgrades
- Phase 6 multiple floors and complete run progression
- Phase 7 audio, presentation expansion, and balancing
- Phase 8 production release and full browser CI
- Virtual mobile movement controls

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

The production bridge isolation audit searches `dist` for `__DUNGEON_ESCAPE_E2E__` and `installE2EBridge` after a production build.

## Final test results

- `pnpm format`: passed; Prettier formatted all tracked project sources and documentation.
- `pnpm install`: passed; dependencies were already synchronized.
- `pnpm install --frozen-lockfile`: passed; the lockfile reproduced without changes.
- `pnpm format:check`: passed with all matched files formatted.
- `pnpm lint`: passed with zero warnings.
- `pnpm typecheck`: passed under strict TypeScript settings.
- `pnpm test:run`: passed — 3 test files and 37 unit tests.
- Representative generator batch: 100 deterministic seeds generated and passed validation within the unit suite.
- `pnpm build`: passed with Vite 8.2.1.
- `pnpm test:e2e`: passed — 5 Playwright tests in Chromium.
- `pnpm check`: passed the formatting, lint, typecheck, unit-test, and production-build gates.
- `git diff --check`: passed.
- Production bridge isolation: passed; `__DUNGEON_ESCAPE_E2E__` and `installE2EBridge` were absent from `dist`.
- Visual review: passed at 1440 × 900, 960 × 540, and 1024 × 640 browser viewports with a centred 16:9 canvas, readable walls and corridors, separate HUD/minimap regions, and no page overflow.

## Known limitations

- Destination data is intentionally metadata-only and is neither rendered nor actionable.
- Room discovery occurs on room entry; corridors appear on the minimap only after both endpoint rooms are discovered.
- The generator uses a fixed Phase 2 configuration rather than user-facing map-size controls.
- Movement is keyboard-first; virtual movement controls remain deferred.
- Phaser remains the majority of the production JavaScript bundle.
- Full Playwright execution remains local in Phase 2; CI runs the non-browser quality gates.

## Release references

- **Phase 2 implementation commit:** `a03456a1c0f71d73d1f79b610a373ead4aaff08b`
- **Release tag:** annotated tag `v0.2.0`, created at the verified phase-record commit after this document is committed
- **Remote:** `https://github.com/Meiir-Orazalin/Dungeon-Escape.git`

Historical note: published tag `v0.1.0` remains at `819765fd0d5b5d80c1c3f083700f0f82112deecc`. Phase 2 must not move, delete, recreate, or force-update it.
