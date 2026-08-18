# Phase Status

## Current release

- **Version:** `v0.6.0`
- **Phase:** Phase 6 — Complete Deterministic Three-Floor Run
- **State:** Complete, verified, deployed, and ready to publish
- **Canonical production URL:** `https://meiirorazalin.com/`
- **Phase 6 implementation commit:** `f72869c0a2c80970e389a8a3e1ace5ab09e61910`
- **Focused verification fix:** `6ad2f7428b5dc01cfd727815f8b6628b2f1f6bc6` — aligned the bridge-free live suite with intentional Phase 6 metadata/startup copy and extended its teleport-global checks

The implementation preserves the existing GitHub Pages architecture: explicit Vite base `/`, `dist`-only workflow deployment from `main`, canonical custom domain, enforced HTTPS, and readiness-gated bridge-free live smoke. No DNS, Pages, certificate, homepage, or repository-variable changes are required.

## Completed Phase 6 implementation

- One normalized URL seed plans the complete run; Floor 1 uses it exactly and Floors 2/3 use distinct versioned deterministic derived seeds.
- A pure immutable `RunPlan` creates and validates exactly three complete floor bundles before play. Its `rn-xxxxxxxx` fingerprint covers ordered seeds, themes, exact difficulty profiles, all twelve floor fingerprints, carry/heal/economy contracts, and floor/run purchase limits.
- The existing `dg-`, `eo-`, `ec-`, and `lt-` meanings remain unchanged. Floor 1 fingerprints match direct Phase 5-style planning from the URL seed.
- The three floors are **The Shifting Catacombs**, **The Ember Vaults**, and **The Obsidian Sanctum**, with immutable presentation-only themes.
- Difficulty profiles are exact: depth-1 base; depth-2 `+1` health, `1.08` movement, `0.92` action waits, `1.10` projectile/charge; depth-3 `+2`, `1.16`, `0.84`, `1.20`. Enemy damage remains `1`, Wisp telegraph `350 ms`, and Warden wind-up `550 ms`.
- Current health, available/total shards, and global selected upgrades carry. Continue applies exactly one transition health, clamped to the derived maximum.
- Every floor has fresh objective/enemies/loot/chests/pickups/discovery/forge. Forge purchases reset to costs `6` then `8`, with two purchases per floor and six across the run.
- The catalog contains the six unchanged Phase 5 upgrades plus Windstep Sigil (`1.15` ordinary movement) and Stalwart Rune (`90 ms` hit stun, `80 ms` knockback duration).
- Deterministic offers include floor number, floor-local offer index, current floor loot fingerprint, and stable global selections. Exactly three unselected cards remain legal through the final sixth purchase.
- Floor 1/2 gates enter guarded **FLOOR CLEARED** transitions; Continue commits once, heals once, and renders the already-planned next floor. Floor 3 produces **DUNGEON CONQUERED** with no fourth floor.
- Defeat on any floor produces **FALLEN IN THE DEPTHS** and ends the entire run.
- Active-run <kbd>R</kbd> restores the immutable current floor-entry checkpoint. Terminal <kbd>R</kbd> restarts the whole same-seed RunPlan from Floor 1. <kbd>N</kbd> creates a new RunPlan. Reload begins a fresh Floor 1 run because no persistence exists.
- Separate floor/run timers, current-floor minimap reset, carry-aware HUD, FloorSummary records, and cumulative victory/defeat statistics are implemented.

## Preserved behavior and isolation

Phase 1 movement/input/responsiveness, Phase 2 generation, Phase 3 objectives, Phase 4 combat/enemies, Phase 5 per-floor loot/forge behavior, and v0.4.1 deployment protections remain in force. Loot and enemy clearance remain optional. No boss, trap, inventory, equipment, shop, audio, score, persistence, save, backend, service worker, or Phase 7 presentation scope was added.

The E2E bridge only exposes read-only run/floor/checkpoint/stat snapshots and the existing constrained player-positioning actions. It provides no floor advance, objective completion, victory, defeat, health/shard/build mutation, checkpoint restore, enemy kill, chest open, or pickup collection. Production scanning still rejects the bridge global, installer, and every teleport identifier.

## Local verification record

The implementation flow uses:

```text
pnpm format
pnpm install
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm audit:production
pnpm test:e2e
pnpm check
git diff --check
```

Final verified evidence:

- Unit tests: 17 files and 277 tests passed, including 100 RunPlans / 300 floor bundles.
- Local Chromium: 38 tests passed, including real three-floor progression, checkpoint replay from gameplay and Runeforge selection, new-run routing from Runeforge selection, victory, Floor 2 defeat, carry behavior, and production-bridge isolation.
- Production audit: 47 assertions passed across 10 deployed files.
- Production build: passed; minified main JavaScript was `1,535.11 kB` (`400.13 kB` gzip) and retained Vite's existing advisory above the configured `1,500 kB` warning threshold.
- Live Chromium: 5 bridge-free tests passed after production deployment, covering metadata/assets, fixed-seed startup, HTTP-to-HTTPS, `www` query-preserving redirect, and production isolation.
- Formatting, ESLint, and strict TypeScript passed. Local visual review covered all three themes, Floor Cleared, Runeforge cards including Windstep/Stalwart, victory, defeat, and the `720 × 700` narrow layout with no page scrolling, clipping, page errors, or failed assets.
- Live visual review at `https://meiirorazalin.com/?seed=phase6-production-review` confirmed the three-floor menu, real Enter startup, Floor 1 theme/HUD, valid canonical HTTPS, a `641.25 × 358.703125` canvas at the `720 × 700` viewport, no scrolling, no page/console/request errors, no mixed/localhost resources, no development overlay, and no production E2E bridge.

## Production verification

- Implementation Quality run `32097555904`: success.
- Implementation Deploy Production run `32097555890`: **Verify and deploy** job `95591737187` succeeded and published the application; its first live-smoke job `95593029150` accurately failed because two stable assertions still expected Phase 5 public copy.
- Focused-fix Quality run `32098337581`: success; job `95593879437`.
- Corrected Deploy Production run `32098337586`: success.
  - **Verify and deploy** job `95593879496`: success, including 38 local Chromium tests, artifact audit, and GitHub Pages deployment.
  - **Live production smoke** job `95595194423`: success; all 5 bridge-free tests passed.
- Independent post-deploy `LIVE_BASE_URL=https://meiirorazalin.com pnpm test:live`: 5 passed.
- GitHub Pages remained `build_type: workflow`, `cname: meiirorazalin.com`, `protected_domain_state: verified`, certificate `approved`, and `https_enforced: true` with `html_url: https://meiirorazalin.com/`.
- Repository variables remained `PRODUCTION_URL=https://meiirorazalin.com` and `PRODUCTION_DOMAIN_READY=true`; repository homepage remained the canonical URL.
- The root deployment served Phase 6 metadata and startup copy; HTTP and `www` redirects, query preservation, and canonical host behavior passed the live suite.

## Known limitations and deferred scope

- Keyboard and pointer are the primary controls; there are no virtual mobile controls.
- Enemies remain room-local regular archetypes; there is no boss or cross-floor pursuit.
- The production JavaScript chunk retains the existing advisory size warning; it is not hidden or raised.
- Runs are intentionally session-only. Refreshing the URL loses floor, health, shard, build, timer, and statistics state.
- Phase 7 audio/presentation/balancing and Phase 8 optimization remain deferred.

## Release intent and historical tags

After this verification record is deployed and its final workflows pass, annotated tag `v0.6.0` will point to final `main` with message `Phase 6: complete deterministic three-floor run`.

Published historical targets must remain unchanged:

- `v0.5.0` → `944780aee6c2c592ccbfc6855126a41d47d0a561`
- `v0.4.1` → `fdeea817472b3a8c5db41b2d331373a3a97ebe33`
- `v0.4.0` → `b7dd859e6b2106e5f17066d38d55f5bba2514529`
- `v0.3.0` → `bb29079df58b32645278e0843f6cd6ed2966b46e`
- `v0.2.0` → `8f704df17d79cadb26b6e17834075814f1dd11ee`
- `v0.1.0` → `819765fd0d5b80c1c3f083700f0f82112deecc`
