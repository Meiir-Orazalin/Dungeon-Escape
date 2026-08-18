# Release Hardening

## Phase 8 scope

Phase 8 changes release engineering and graceful runtime boundaries, not gameplay. The immutable `test/fixtures/v0.7.0-planning-fingerprints.json` records five run fingerprints, fifteen floor seeds, and all sixty floor subsystem fingerprints captured before Phase 8 edits. Unit tests require exact reproduction.

The deep Chromium suite retains full gameplay coverage. The core matrix repeats focused boot, settings, movement/input, objective, transition, fallback, Pause, and responsive contracts in Chromium, Firefox, and WebKit. Forced Canvas has an isolated E2E mode; production remains Phaser.AUTO and the override identifier is rejected from `dist`.

## Runtime boundaries

Pure capability detection describes Canvas, WebGL, audio, storage, fullscreen, reduced motion, pointer, and selected renderer without entering planning. Audio and storage/fullscreen failures remain non-fatal. Missing both renderers and critical initialization failure use a Phaser-independent `DUNGEON ESCAPE COULD NOT START` panel with reload, browser guidance, and package version but no stack trace or private path.

WAV loading starts after Menu rendering and never gates canvas/menu startup. The existing 22 original files, unlock behavior, silent fallback, one-ambience rule, pause/visibility behavior, and audio budgets are unchanged.

Pointer mapping tests cover CSS scale, camera scroll, resize, and defensive invalid bounds; Phaser pointer/camera transforms remain the runtime authority for Canvas and WebGL. A capture listener prevents the documented gameplay keys from scrolling only while the game exists. Existing one-shot held guards suppress repeat.

## Accessibility and lifecycle

Pure WCAG contrast helpers validate essential normal text at 4.5:1, large text at 3:1, and non-text boundaries at 3:1. Focus, live announcements, large text, high contrast, reduced motion, Canvas label, and the non-canvas control summary remain intact.

E2E-only lifecycle diagnostics expose bounded numeric/string summaries: renderer, scenes, objects, bodies, colliders, listeners, tweens, projectiles, pickups, enemies, overlays, audio, and effects. They expose no Phaser object references and are absent from production. The soak repeats Pause/Resume, Settings, Manual, mute, viewport changes, and checkpoint replay and then asserts stable bounded state.

## Static budgets and deployment

- Application JavaScript: 300,000 bytes minified maximum
- Phaser vendor: 1,450,000 bytes minified maximum
- Combined JavaScript gzip: 450,000 bytes maximum
- Audio: 3,500,000 bytes maximum
- Entire deployed site: 6,500,000 bytes maximum
- Single non-audio asset: 1,500,000 bytes maximum
- Runtime: 10 SFX voices, one ambience, 96 normal/48 reduced-motion transient effects

Production and release audits compute exact bytes and deterministic gzip, validate vendor separation, reject source maps/artifacts/external runtime resources, and enforce bridge/Canvas/diagnostic isolation. Deployment is gated by frozen install, `check:release`, deep Chromium, the engine matrix, Canvas, soak, artifact audit, and a bridge-free three-engine live matrix.

GitHub Pages and DNS remain unchanged. Rollback is a normal `git revert` pushed to main, followed by all gates and deployment. There is no service worker, backend, telemetry, persistence, native wrapper, new gameplay, or license change.
