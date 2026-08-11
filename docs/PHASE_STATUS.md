# Phase Status

## Current release

- **Version:** `v0.3.0`
- **Current phase:** Phase 3 — Deterministic Escape Objective
- **Phase state:** Complete and verified; final phase-record commit and release publication pending

## Completed Phase 3 requirements

- Pure deterministic objective planner, graph-distance ranking, fingerprint, and validator
- Third-room Runic Key placement with bounded deterministic safe-tile search
- Ancient Gate placement from unchanged Phase 2 destination metadata
- Pure seeking-key, key-collected, and completed state machine
- Inclusive 52-pixel squared-distance interaction selection
- Guarded <kbd>E</kbd> key with key, sealed-gate, and ready-gate prompts
- Programmatic Runic Key and Ancient Gate visuals with bounded tweens
- Locked-gate reaction, key transition feedback, and accessibility announcements
- Objective-aware HUD with key state, controls, discovered rooms, and MM:SS timer
- Discovered-only minimap key and sealed/ready gate markers
- One-floor completion that freezes movement, interaction, and elapsed time
- Camera-fixed **Dungeon Escaped** overlay with keyboard and pointer replay/new controls
- E2E-only named-target teleport action with no arbitrary coordinates or objective mutation

## Intentional restart semantic extension

Phase 2 <kbd>R</kbd> returned the existing player to spawn without regenerating the scene. Phase 3 <kbd>R</kbd> now performs a clean same-seed floor replay. It preserves dungeon and objective fingerprints while restoring the key, resealing the gate, resetting elapsed time and discovery, and returning the player to spawn.

## Preserved Phase 1 and Phase 2 requirements

- Pointer, Enter, and Space menu start
- WASD and arrow movement with normalized diagonal velocity
- Generated wall collision, world containment, camera following, and responsive scaling
- Deterministic 10–14-room layouts, three-tile corridors, connected floor, and safe spawn
- URL seed reproduction, friendly new seeds, structural layout fingerprint, and dynamic world bounds
- <kbd>N</kbd> new-dungeon behavior and listener cleanup
- Existing room/corridor discovery rules and hidden undiscovered rooms
- Strict TypeScript, ESLint, Prettier, Vitest, Playwright, Vite, and non-browser GitHub Actions gates

## Deferred requirements

- Phase 4 enemies, attacks, weapons, combat, health, damage, death, traps, and AI
- Phase 5 coins, general loot, chests, potions, equipment, inventory screens, and upgrades
- Phase 6 multiple floors, floor transitions, difficulty scaling, bosses, victory runs, and defeat runs
- Phase 7 audio, expanded presentation, accessibility work, and balancing
- Phase 8 production deployment, cross-browser release verification, and full browser CI
- Score calculations, best times, persistent/localStorage progression, and virtual mobile controls

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

The production audit searches built JavaScript for `__DUNGEON_ESCAPE_E2E__`, `installE2EBridge`, and `teleportToTarget`.

## Final test results

- `pnpm format`: passed; Prettier formatted all project sources and documentation.
- `pnpm install`: passed; dependencies were already synchronized.
- `pnpm install --frozen-lockfile`: passed without lockfile changes.
- `pnpm format:check`: passed with all matched files formatted.
- `pnpm lint`: passed with zero warnings.
- `pnpm typecheck`: passed under strict TypeScript settings.
- `pnpm test:run`: passed — 6 test files and 81 unit tests, preserving the original 37 tests and adding 44 Phase 3 tests.
- Representative objective batch: 100 deterministic generated layouts produced valid objective plans.
- `pnpm build`: passed with Vite 8.2.1.
- `pnpm test:e2e`: passed — 10 Playwright tests in Chromium.
- Baseline browser note: the initial sandboxed Phase 2 E2E command failed with `listen EPERM` on `127.0.0.1:4173`; the required unrestricted rerun of the exact command passed all 5 baseline tests before implementation.
- `pnpm check`: passed the formatting, lint, typecheck, unit-test, and production-build gates.
- `git diff --check`: passed.
- Production bridge isolation: passed; `__DUNGEON_ESCAPE_E2E__`, `installE2EBridge`, and `teleportToTarget` were absent from `dist`.
- Browser diagnostics: no page errors, uncaught exceptions, failed local requests, Phaser errors, duplicate controls, stale objective objects, post-completion timer movement, or movement behind the overlay.
- Visual review: passed at 1440 × 900, 960 × 540, 1024 × 640, and 720 × 700. The key, sealed/ready gate, prompt, timer, maximum-length seed, minimap, completion overlay, buttons, and centred no-scroll canvas remained readable.

## Known limitations

- The objective loop covers one floor only.
- The Runic Key is a single objective item rather than a general inventory.
- Completion time is session-only and has no score, best time, or persistence.
- Objective placement and dungeon dimensions use fixed Phase 3 configuration.
- Movement remains keyboard-first; virtual controls are deferred.
- Phaser remains the majority of the production JavaScript bundle.
- Full Playwright execution remains local; CI runs the non-browser quality gates.

## Release references

- **Phase 3 implementation commit:** `594949bad53ae866726a14e9c46debb8d39c29d4`
- **Release intent:** annotated tag `v0.3.0` at the final verified phase-record commit
- **Remote:** `https://github.com/Meiir-Orazalin/Dungeon-Escape.git`

Published Phase 2 tag `v0.2.0` peels to `8f704df17d79cadb26b6e17834075814f1dd11ee`. Published Phase 1 tag `v0.1.0` peels to `819765fd0d5b5d80c1c3f083700f0f82112deecc`. Both releases remain published and unchanged.
