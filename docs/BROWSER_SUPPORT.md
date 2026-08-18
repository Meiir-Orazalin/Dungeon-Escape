# Browser Support

## v1.0.0 automated contract

The release contract is the Chromium, Firefox, and WebKit engines pinned by the repository Playwright lockfile. Chromium approximates current Chrome and Edge engine behavior; Firefox exercises Gecko; WebKit is the automated Safari-family compatibility proxy, not a claim that every historical Safari release behaves identically.

Production keeps `Phaser.AUTO`: WebGL is preferred and Canvas is the supported fallback. A separate E2E-only build forces Canvas and verifies menu, movement, pointer targeting, objective interaction, Pause, Settings, resize, and floor transition without changing planning fingerprints.

Audio is optional and may degrade silently when unavailable or blocked. Denied localStorage falls back to defaults, so presentation preferences may not persist. Fullscreen is optional and rejected/unsupported requests are handled. Missing WebGL is non-fatal when Canvas exists; missing both renderers produces friendly reload guidance.

Keyboard and pointer landscape play are primary. Portrait remains readable and recommends landscape, but there are no virtual controls. Controller and offline support are not part of v1.0.0.

## Commands

```bash
pnpm test:e2e
pnpm test:e2e:release
pnpm test:e2e:canvas
pnpm test:soak
LIVE_BASE_URL=https://meiirorazalin.com pnpm test:live:matrix
```

`pnpm test:e2e:install:all` installs the three pinned engines. Any real application regression in one release engine, Canvas fallback, or the live matrix blocks deployment and publication.

Known limitations: browser audio/autoplay policies vary; fullscreen support varies; WebKit is a Safari-family proxy; touch-only gameplay and historical browser versions are not claimed.
