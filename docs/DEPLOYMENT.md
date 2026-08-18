# Production Deployment Contract

## Architecture

Dungeon Escape is a static client application: Vite emits HTML, CSS, JavaScript, and committed public assets into `dist`. Phaser runs entirely in the browser, and the game has no backend, database, API endpoint, analytics client, service worker, or server-rendered route.

GitHub Pages deploys only `dist` from verified `main` commits through `.github/workflows/deploy-pages.yml`. There is no `gh-pages` branch, and `dist` is ignored rather than committed. Every verified push to `main` automatically starts a fresh build and deployment.

## Build and root-path contract

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:e2e
```

`pnpm build` creates `dist`; `pnpm audit:production` audits that already-built directory without starting a server or modifying it. Vite's production `base` is explicitly `/` because the custom domain serves the game at its root. `/Dungeon-Escape/` is never a production asset base, while local development, local preview, E2E mode, and seed queries remain supported.

The stable release keeps `chunkSizeWarningLimit: 1500` and isolates Phaser in one `phaser-vendor-*` chunk. Final budgets are 300,000 application bytes, 1,450,000 vendor bytes, 450,000 combined gzip JavaScript bytes, 3,500,000 audio bytes, 6,500,000 deployed bytes, and 1,500,000 bytes for any single non-audio asset. Audits use structure rather than exact hashes and never raise thresholds to hide failures.

Original generated PCM WAV files and `audio/audio-manifest.json` are committed static assets copied into `dist`. `pnpm audit:audio` validates source assets, and `pnpm audit:production` independently checks the deployed files, WAV headers, required identities, external-URL absence, and the 3.5 MB budget. Production uses no audio CDN.

## GitHub Actions

The **Quality** workflow uses read-only repository access and runs the frozen install plus `pnpm check:release` for pushes to `main` and pull requests.

The **Deploy Production** workflow uses only:

```yaml
contents: read
pages: write
id-token: write
```

Its deployment job checks out the exact commit, performs frozen install and release checks, installs Chromium/Firefox/WebKit with Linux dependencies, then requires deep Chromium, core engine matrix, Canvas fallback, and lifecycle soak before uploading only `dist`. Its dependent live job runs the bridge-free matrix in all three engines. Tag and GitHub Release creation happen only after final deployment and live verification.

Actions are pinned to immutable commits:

- `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1` (`v7`)
- `pnpm/setup@c9883cc79df532ad1a7b81bf9ab944ceb090d65c` (`v2.0.0`)
- `actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d` (`v6`)
- `actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9` (`v5`)
- `actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128` (`v5`)

## Repository configuration

The public, non-secret Actions variables are:

| Variable                  | Value                        |
| ------------------------- | ---------------------------- |
| `PRODUCTION_URL`          | `https://meiirorazalin.com`  |
| `PRODUCTION_DOMAIN_READY` | `true` after verified launch |

The Pages REST API is configured with `build_type: workflow` and `cname: meiirorazalin.com`. The API-managed custom-domain setting is deliberately used instead of a repository `CNAME` file, and branch-based Pages publication is not used.

The relevant API checks are:

```bash
gh api -H "X-GitHub-Api-Version: 2026-03-10" repos/Meiir-Orazalin/Dungeon-Escape/pages
gh api -H "X-GitHub-Api-Version: 2026-03-10" repos/Meiir-Orazalin/Dungeon-Escape/pages/health
```

## Canonical domain and DNS

The canonical URL is `https://meiirorazalin.com/`. GitHub Pages redirects `www` to the apex, and plain HTTP is redirected to HTTPS after certificate approval and HTTPS enforcement.

Required apex records:

| Type  | Name | Value                      |
| ----- | ---- | -------------------------- |
| A     | @    | `185.199.108.153`          |
| A     | @    | `185.199.109.153`          |
| A     | @    | `185.199.110.153`          |
| A     | @    | `185.199.111.153`          |
| AAAA  | @    | `2606:50c0:8000::153`      |
| AAAA  | @    | `2606:50c0:8001::153`      |
| AAAA  | @    | `2606:50c0:8002::153`      |
| AAAA  | @    | `2606:50c0:8003::153`      |
| CNAME | www  | `meiir-orazalin.github.io` |

TTL may be automatic/default or approximately 3600 seconds. `www` points directly to `meiir-orazalin.github.io`, never the apex and never a `/Dungeon-Escape` path. No wildcard is required. Preserve unrelated MX and TXT records and remove only records that conflict with the apex website or exact `www` host.

Verify public resolution independently:

```bash
dig meiirorazalin.com A
dig meiirorazalin.com AAAA
dig www.meiirorazalin.com CNAME
```

## Profile-level domain verification

Repository custom-domain configuration does not replace account-level protection. The owner must open GitHub profile **Settings → Pages → Add a domain → meiirorazalin.com**, copy the unique TXT hostname and value GitHub displays, publish them at the DNS provider, and keep the TXT record after verification. Never invent, reuse, or commit this challenge token.

The Pages API may expose `protected_domain_state` and `pending_domain_unverified_at`; launch finalization waits for a verified state when available. Retaining verification protects the custom domain from accidental takeover if repository settings later change.

## Certificate and HTTPS finalization

Keep `https_enforced` false while GitHub's `https_certificate.state` is pending. Use bounded Pages health/API checks and wait for certificate state `approved`. Confirm the apex HTTPS page is valid, then enable HTTPS enforcement through the Pages API and verify `https_enforced: true`.

Final redirect requirements are:

- `http://meiirorazalin.com/` redirects to `https://meiirorazalin.com/`;
- `https://www.meiirorazalin.com/?seed=www-redirect-check` redirects to the apex while preserving its query;
- canonical metadata always points at `https://meiirorazalin.com/`, not the default Pages domain.

## Live smoke testing

The live suite has no local server and refuses to default to localhost:

```bash
LIVE_BASE_URL=https://meiirorazalin.com pnpm test:live
```

It verifies metadata/assets, a fixed-seed canvas startup, HTTP-to-HTTPS behavior, the `www` redirect, seed-query preservation, browser diagnostics, and production bridge isolation. Set `PRODUCTION_DOMAIN_READY=true` only after DNS, account verification, certificate approval, HTTPS, apex, and `www` all pass; then dispatch **Deploy Production** so the live-smoke job runs.

The Phase 7 suite additionally verifies the audio manifest, representative ambience/effect assets, Settings and How to Play public menu copy, absence of external audio requests, and absence of autoplay-related uncaught errors. It remains bridge-free and does not perform fragile deep three-floor combat checks against production.

## Troubleshooting

- **Build or audit failure:** reproduce with `pnpm check`, fix the scoped repository issue, and push a normal commit. Never upload an older `dist`.
- **Local browser failure:** install the project Chromium with `pnpm test:e2e:install`; CI uses `playwright install --with-deps chromium`.
- **DNS mismatch:** compare all returned A/AAAA records and the exact `www` CNAME. Remove only conflicting parking/ALIAS/ANAME records; do not change unrelated mail or verification data.
- **Unverified domain:** complete profile Settings → Pages verification with GitHub's exact TXT challenge and retain it.
- **Pending certificate:** keep HTTPS enforcement off, confirm DNS health, and poll the Pages API only for a bounded interval. Never accept a certificate warning.
- **Failed live smoke:** classify the failure as application, deployment, DNS, certificate, redirect, or plausible edge propagation. Retry propagation only a bounded number of times and never weaken the smoke contract.

## Non-destructive rollback

1. Identify the last known-good `main` commit.
2. Revert the offending commit with `git revert`.
3. Push the revert normally to `main`.
4. Let **Deploy Production** build and deploy that new revert commit.
5. Require the deployment and live smoke tests to pass.

Never force-push `main`, move a published tag, delete the Pages site as a routine rollback, or remove DNS for an ordinary application regression. In a domain-security emergency, remember that disabling Pages while DNS still points at GitHub may increase takeover risk unless the account retains verified control of the domain.

## Stable-release rollback

The existing non-destructive rollback remains authoritative: revert the offending main commit, push normally, and require the full release gates, deployment, and live matrix. Never move a published tag. DNS, custom-domain, certificate, and Pages architecture remain unchanged.

## Intentionally deferred infrastructure

This deployment adds no analytics, advertising, cookies, telemetry, external error reporting, service worker, offline cache, install prompt, backend hosting, SSR, API endpoint, account system, domain email configuration, or portfolio content.
