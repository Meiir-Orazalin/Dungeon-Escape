# Milestone Status

## Current milestone

- **Version:** `v0.4.1`
- **Milestone:** Public Web Deployment
- **State:** Complete, verified, deployed, and published
- **Canonical URL:** `https://meiirorazalin.com/`
- **Gameplay changes:** None
- **Deployment implementation commit:** `90689447e906a79f85dccaa81fdc1b2c7eafd00b`
- **Live-smoke seed-contract fix:** `f53e2f01cadff7e6a84334580d00bdb5bfb4a59f`

## Verified production deployment

- Static Vite build with explicit root base `/`
- GitHub Pages `build_type: workflow`, publishing only `dist` from `main`
- API-managed custom domain `meiirorazalin.com`; no repository `CNAME` file and no `gh-pages` branch
- Immutable action SHA pins and minimal workflow permissions
- `PRODUCTION_URL=https://meiirorazalin.com`
- `PRODUCTION_DOMAIN_READY=true`
- Repository homepage: `https://meiirorazalin.com`
- Canonical, search, Open Graph, and Twitter metadata
- Original favicon, 192/512 icons, 1200 × 630 social preview, manifest, robots policy, and sitemap
- Dependency-free production audit and separate bridge-free live smoke suite

## Domain, certificate, and redirect evidence

- Apex A records resolve to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`
- Apex AAAA records resolve to `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, and `2606:50c0:8003::153`
- `www.meiirorazalin.com` resolves directly to `meiir-orazalin.github.io`
- System and Cloudflare `1.1.1.1` resolver results agree
- Pages protected-domain state: `verified`; `pending_domain_unverified_at: null`
- Certificate state: `approved` for the apex and `www`, expiring `2026-11-12`
- Pages API: `https_enforced: true`, `html_url: https://meiirorazalin.com/`
- Pages health: asynchronous `202` followed by `200`; both hosts are valid, served by Pages, HTTPS-responsive, eligible, and report no HTTPS or CAA error
- `http://meiirorazalin.com/` returns `301` to `https://meiirorazalin.com/`
- `https://www.meiirorazalin.com/?seed=www-redirect-check` returns the HTTPS apex while preserving `?seed=www-redirect-check`
- Seed URLs remain canonical-host URLs and production metadata remains queryless at `https://meiirorazalin.com/`

## Workflow evidence

- Stage A Quality run `31493443159`: succeeded
- Stage A Deploy Production run `31493443160`: deployment succeeded; readiness-gated live smoke was intentionally skipped
- First Stage B dispatch `31995720300`: deployment succeeded; four live tests passed and the metadata test exposed an incorrect queryless-runtime assertion
- The test was corrected to accept the game's documented friendly-seed URL synchronization while retaining an exact queryless canonical metadata assertion
- Corrected Quality run `31996157180`: succeeded in 34 seconds
- Corrected Deploy Production run `31996157208`: succeeded
  - Verify and deploy job `95288055276`: succeeded in 4 minutes 34 seconds
  - Live production smoke job `95288743325`: all 5 tests passed in 59 seconds

## Local verification

- `pnpm install --frozen-lockfile`: passed; lockfile already up to date
- `pnpm format:check`: passed
- `pnpm lint`: passed with zero warnings
- `pnpm typecheck`: passed under strict TypeScript
- `pnpm test:run`: 11 files and 205 unit tests passed
- `pnpm build`: passed with Vite 8.2.1 and Phaser 4.2.1
- `pnpm audit:production`: all 43 assertions passed across 10 deployed files
- `pnpm test:e2e`: initial sandbox run hit the documented `listen EPERM` on `127.0.0.1:4173`; the exact unrestricted rerun passed all 22 Chromium tests
- `pnpm check`: passed, including formatting, ESLint, TypeScript, unit tests, build, and production audit
- `LIVE_BASE_URL=https://meiirorazalin.com pnpm test:live`: all 5 live Chromium tests passed
- `git diff --check`: passed

The production audit confirms root-relative assets and excludes source maps, reports, environment files, localhost URLs, the repository-name base, `__DUNGEON_ESCAPE_E2E__`, `installE2EBridge`, and all three teleport action identifiers.

## Live visual review

The HTTPS site passed visual review at 1440 × 900, 960 × 540, 1024 × 640, and 720 × 700 with fixed seed `production-visual-review`. The timeless header, favicon, menu, controls, centered canvas, active dungeon HUD, and minimap remain readable without page scrolling. A real Enter press starts the game; the live suite reports no page errors, console errors, failed same-origin assets, mixed content, development overlay, or production E2E bridge.

## Preserved Phase 1–4 functionality

- Menu, responsive canvas, generated walls, movement, camera, and collision
- Deterministic dungeon, objective, and encounter plans with unchanged fingerprints
- Runic Key and Ancient Gate one-floor escape loop
- Three room-local enemy archetypes, sword, dash, health, damage, defeat, and reset behavior
- Existing E2E-only bridge isolation
- No combat rebalancing and no Phase 5 gameplay

## Known limitations and deferred work

- Combat and objectives remain one-floor and keyboard/pointer first
- Enemies remain room-bound and drop nothing
- Phase 5 loot/upgrades, later floors, audio, persistence, analytics, backend services, offline support, and virtual controls remain deferred
- GitHub Pages is a static deployment; there is no server-side rendering, API, service worker, or offline cache

## Release intent and historical targets

The verified launch record is intended for annotated tag `v0.4.1` after its final `main` deployment and both final workflows pass. The release-record commit does not attempt to contain its own SHA.

- `v0.4.0` → `b7dd859e6b2106e5f17066d38d55f5bba2514529`
- `v0.3.0` → `bb29079df58b32645278e0843f6cd6ed2966b46e`
- `v0.2.0` → `8f704df17d79cadb26b6e17834075814f1dd11ee`
- `v0.1.0` → `819765fd0d5b5d80c1c3f083700f0f82112deecc`

All published historical tags remain immutable.
