# Milestone Status

## Current milestone

- **Version:** `v0.4.1`
- **Milestone:** Public Web Deployment
- **State:** Deployment infrastructure complete; custom-domain verification pending
- **Canonical URL:** `https://meiirorazalin.com/`
- **Gameplay changes:** None

## Deployment infrastructure

- Static Vite build with explicit root base `/`
- GitHub Pages deployment from `main` through the **Deploy Production** workflow
- Immutable action SHA pins and minimal Pages permissions
- Deployment artifact limited to `dist`
- Separate readiness-gated bridge-free live smoke job
- Canonical, search, Open Graph, and Twitter metadata
- Original generated favicon, 192/512 icons, and 1200 × 630 social preview
- Web manifest without a service worker, crawlable robots policy, and canonical sitemap
- Dependency-free production artifact audit
- Repository Pages configuration uses `build_type: workflow` and API-managed custom domain
- No `gh-pages` branch and no repository `CNAME` file

## Preserved Phase 1–4 functionality

- Menu, responsive canvas, generated walls, movement, camera, and collision
- Deterministic dungeon, objective, and encounter plans with unchanged fingerprints
- Runic Key and Ancient Gate one-floor escape loop
- Three room-local enemy archetypes, sword, dash, health, damage, defeat, and reset behavior
- Existing E2E-only bridge isolation; production and live smoke builds expose no bridge
- No combat rebalancing and no Phase 5 gameplay

## Local verification

- `pnpm install --frozen-lockfile`: passed
- Baseline `pnpm check`: passed with 11 files and 205 unit tests
- Baseline `pnpm test:e2e`: passed with 22 Chromium tests after two bounded retries for unrelated timing-sensitive assertions; no source changes were made between attempts
- Final `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm test:run`: passed; 11 files and 205 unit tests
- Final `pnpm build`: passed with Vite 8.2.1 and Phaser 4.2.1
- Final `pnpm test:e2e`: passed; 22 Chromium tests
- `pnpm check`: passed, including the production build and artifact audit
- Production artifact audit: passed all 43 assertions across 10 deployed files; no bridge identifiers, source maps, reports, environment files, localhost URLs, or repository-name base
- Workflow audit: both YAML files parsed; permissions, readiness gate, full action SHAs, and `dist`-only upload were confirmed
- Local production visual review: passed at 1440 × 900, 960 × 540, 1024 × 640, and 720 × 700 with fixed seed `production-visual-review`; no scrolling, page errors, console errors, failed assets, phase copy, or prototype copy

## External deployment checkpoint

- **Implementation commit:** Intended as `chore: add GitHub Pages production deployment`
- **Pages build type:** `workflow`, confirmed through the authenticated Pages API
- **Pages custom domain:** `meiirorazalin.com`, confirmed through the authenticated Pages API
- **Protected-domain state:** `null`; profile-level verification has not yet been reported
- **Certificate state:** Not yet returned; certificate issuance is pending correct DNS
- **HTTPS enforced:** `false`, intentionally retained until certificate approval
- **DNS health:** Initial authenticated health request completed with asynchronous `{}` response; public DNS remains incorrect
- **Live smoke:** Disabled with `PRODUCTION_DOMAIN_READY=false` until DNS, domain verification, certificate, HTTPS, apex, and `www` are ready
- **v0.4.1 tag:** Must not be created before verified public launch

Current public DNS evidence:

- Apex A resolves only to Namecheap parking address `162.255.119.74`, not the four GitHub Pages addresses
- Apex AAAA returns no records
- `www` CNAME resolves to `parkingpage.namecheap.com`, not `meiir-orazalin.github.io`

## Known external prerequisite

The account owner must verify `meiirorazalin.com` at GitHub profile **Settings → Pages → Add a domain**, publish GitHub's exact TXT name/value at the DNS provider, and retain that TXT record. The challenge value is never guessed or committed.

The apex and `www` records must match [the deployment contract](DEPLOYMENT.md). Certificate approval and DNS propagation are external and checked only with bounded polling.

## Known limitations and deferred work

- Combat and objectives remain one-floor and keyboard/pointer first
- Enemies remain room-bound and drop nothing
- Phase 5 loot/upgrades, later floors, audio, persistence, analytics, backend services, offline support, and virtual controls remain deferred
- Live production smoke cannot run until the canonical domain and HTTPS contract are genuinely ready

## Historical release targets

- `v0.4.0` → `b7dd859e6b2106e5f17066d38d55f5bba2514529`
- `v0.3.0` → `bb29079df58b32645278e0843f6cd6ed2966b46e`
- `v0.2.0` → `8f704df17d79cadb26b6e17834075814f1dd11ee`
- `v0.1.0` → `819765fd0d5b5d80c1c3f083700f0f82112deecc`

All published historical tags remain immutable.
