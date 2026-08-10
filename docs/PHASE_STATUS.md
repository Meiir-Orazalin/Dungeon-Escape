# Phase Status

## Current release

- **Version:** `v0.1.0`
- **Current phase:** Phase 1 — Foundation and Playable Movement Prototype
- **Phase state:** Implemented and verified locally; completion commit pending

## Completed requirements

- pnpm project with Vite 8, strict TypeScript, Phaser 4.2.1, Vitest, ESLint, Prettier, and Playwright
- `BootScene`, `MenuScene`, and `GameScene` with explicit scene registration
- Intentional title menu with Enter, Space, pointer, and tap-compatible start input
- One handcrafted 1280 × 720 room with a 960 × 540 logical viewport
- Programmatically generated floor, stone, player, shadow, crack, and torch visuals
- Seven interior solid obstacles plus four solid outer walls
- Arcade Physics movement using WASD and arrow keys
- Simultaneous input, normalized diagonal velocity, release-to-stop behaviour, and retained facing direction
- Safe spawn point and <kbd>R</kbd> restart to the exact spawn coordinates
- Light camera following, world bounds, 16:9 FIT scaling, centering, and responsive no-scroll page shell
- Pure movement calculation separated from Phaser and covered by unit tests
- E2E-only dynamic test bridge exposing only scene, player position, and spawn position
- Local Chromium smoke coverage for page errors, menu, canvas, all start inputs, movement, restart, both collision classes, and viewport resizing
- Required repository documentation and a non-browser GitHub Actions quality workflow

## Deferred requirements

- Phase 2 procedural dungeon generation
- Phase 3 escape objective and floor-completion loop
- Phase 4 enemies and combat
- Phase 5 loot and upgrades
- Phase 6 complete three-floor run
- Phase 7 presentation expansion and balancing
- Phase 8 production release and full browser CI
- Virtual mobile controls; desktop keyboard input remains the Phase 1 priority

## Verification commands

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm test:e2e
git diff --check
git status --short
```

## Final test results

- `pnpm install --frozen-lockfile` — passed; lockfile was already up to date
- `pnpm dev` — passed; Vite 8.2.1 started and the game returned HTTP 200 at `127.0.0.1:5173`
- `pnpm format:check` — passed; all matched files use Prettier formatting
- `pnpm lint` — passed with zero ESLint warnings or errors
- `pnpm typecheck` — passed under TypeScript 6.0.3 strict mode
- `pnpm test:run` — passed; 5 of 5 movement unit tests
- `pnpm build` — passed; Vite 8.2.1 production build completed
- `pnpm test:e2e` — passed; 3 of 3 Chromium tests with no browser page errors
- `pnpm check` — passed; all configured non-browser quality gates completed in sequence
- Production isolation audit — passed; no E2E bridge identifiers exist in built JavaScript, HTML, or CSS
- `git diff --check` — passed with no whitespace errors
- `git status --short` — reviewed; only intended Phase 1 source, configuration, lockfile, test, CI, and documentation changes are present

## Known limitations

- The prototype intentionally contains one handcrafted room and no completion objective.
- Movement is keyboard-first; touch can start the menu but virtual movement controls are deferred.
- Phaser is the majority of the production JavaScript bundle; this is expected for the Phase 1 single-entry build.
- Full Playwright execution is local-only in Phase 1; CI runs formatting, linting, type checking, unit tests, and the production build.

## Release references

- **Phase completion commit:** Pending final verification
- **Version tag:** `v0.1.0`
- **Published tag target before full-spec completion:** `819765fd0d5b5d80c1c3f083700f0f82112deecc`
- **Remote:** `https://github.com/Meiir-Orazalin/Dungeon-Escape.git`

The annotated `v0.1.0` tag was already published by the earlier baseline implementation. It will not be destructively moved or force-pushed. The fully specified Phase 1 completion is being delivered as a fast-forward commit on `main`, and its exact SHA will be recorded after the commit exists.
