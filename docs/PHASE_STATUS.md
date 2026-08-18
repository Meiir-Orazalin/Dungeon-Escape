# Phase Status

## v1.0.0 Phase 8 release hardening

- **Version:** `1.0.0`
- **Phase:** Phase 8 — Final Release Hardening
- **State:** Complete, locally verified, deployed, and independently live-verified; the annotated tag and GitHub Release follow only after this record is deployed.
- **Canonical production URL:** `https://meiirorazalin.com/`
- **Phase 8 implementation:** `bed9742fc64af743bb5f627bbf7a8f9c9cb19d00`
- **Focused fixes:**
  - `d35763444c1f28f3e39c0defc1db4f8d20889a4c` — wait for `MenuScene` readiness before reload/fallback keyboard-start assertions on a slower Linux WebKit runner.
  - `f497615b111d0688c2dcc0f5a499917b003e5e4a` — register a reconstructed Pause overlay on the next browser task so WebKit cannot deliver a child-overlay closing Escape event to its new listener.
- **Verification record:** `f99a36efdebec234a8ad95308bd5cf5a3f9a9905`; this final post-fix documentation update does not embed its own SHA.
- **Published Phase 7 baseline:** annotated `v0.7.0` at `7dc2c37c53cf2d7fbd1b0eea0908229ad388fd8a`

Phase 8 adds release hardening only. The five-seed Phase 7 fixture preserved five run fingerprints, fifteen floor seeds, and sixty floor-local layout/objective/encounter/loot fingerprints exactly. The game remains exactly three floors with eight upgrades and unchanged combat, difficulty, loot, carry, checkpoint, presentation, audio, pause, settings, and `450 ms` awakening contracts.

## Browser, renderer, capability, and accessibility contract

- The pinned Playwright release engines are Chromium, Firefox, and WebKit. WebKit is a Safari-family compatibility proxy, not a claim about every historical Safari release.
- Production remains `Phaser.AUTO`: WebGL is preferred and Canvas is the supported fallback. The E2E-only Canvas override does not enter production or change fingerprints.
- Audio, storage, and fullscreen are optional. Audio boots and decodes without blocking Menu/canvas creation; audio failures are silent, storage denial uses defaults, and fullscreen rejection remains handled.
- Missing both renderers displays `DUNGEON ESCAPE COULD NOT START`, concise browser guidance, a Reload Game action, and the release version without a player-facing stack trace.
- CSS-scale, DPR, camera-scroll, resize, fullscreen, Canvas, and WebGL pointer mappings share one defensive contract. One-shot keyboard repeats are ignored and gameplay/navigation keys do not scroll the page while game controls own them.
- Fourteen essential text/non-text token pairs pass the documented `4.5:1` or `3:1` contrast thresholds. Canvas labelling, the non-canvas control summary, visible modal focus, announcements, high contrast, large text, and reduced motion remain intact.
- Version text is compiled from `package.json` and renders as `v1.0.0`; an optional CI SHA is presentation-only.

## Local release evidence

Commands completed:

```text
pnpm audio:generate
pnpm format
pnpm install
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm audit:audio
pnpm build
pnpm audit:production
pnpm audit:release
pnpm test:e2e
pnpm test:e2e:release
pnpm test:e2e:canvas
pnpm test:soak
pnpm check
pnpm check:release
git diff --check
LIVE_BASE_URL=https://meiirorazalin.com pnpm test:live:matrix
```

- Unit: `316 / 316` across `20` files.
- Planning compatibility: `5 / 5` run seeds, `15 / 15` floor seeds, and `60 / 60` subsystem fingerprints exact.
- Deep Chromium: `43 / 43`.
- Core browser matrix: `7 / 7` Chromium, `7 / 7` Firefox, `7 / 7` WebKit. The readiness correction additionally passed `21 / 21` across three repeated WebKit runs; the Pause event-loop correction passed `10 / 10` targeted WebKit stress runs.
- Forced Canvas: `12 / 12` with renderer, Menu, run start, movement, pointer attack, Pause, Settings, key/gate, floor transition, resize, and diagnostics covered.
- Lifecycle soak: `1 / 1` in `12.3 s`; ten Pause/Resume cycles, five Settings cycles, five Manual cycles, ten mute toggles, three fullscreen attempts, three viewports, combat/awakening, chest/pickup, forge, floor transition, three replays, and three new runs stayed within listener/object/audio/effect bounds.
- Live matrix: `5 / 5` per engine (`15 / 15`) in the independent post-deploy run.
- Audio: `275 / 275`; the unchanged `22` mono PCM WAV files remain `1,892,860` bytes.
- Production: `109 / 109` across `34` deployed files. Release: `43 / 43`.
- Isolation: production contains no E2E bridge/teleport installer, Canvas override, fatal-test switch, lifecycle diagnostic collector, localhost URL, source map, test artifact, environment file, external runtime script, or external audio.

## Budgets and production artifact

- Application JavaScript: `209,625` bytes minified / `55,049` gzip (budget `300,000`).
- Phaser vendor JavaScript: `1,374,829` bytes minified / `355,968` gzip (budget `1,450,000`).
- Total JavaScript: `1,584,454` bytes minified / `411,017` gzip (gzip budget `450,000`).
- Audio: `1,892,860` bytes (budget `3,500,000`).
- Total deployed site: `3,859,965` bytes (budget `6,500,000`).
- Largest non-audio file: Phaser vendor at `1,374,829` bytes (budget `1,500,000`).
- Runtime limits: ten SFX voices, one ambience, 96 normal/48 reduced-motion transient effects.
- `chunkSizeWarningLimit` remains `1,500` kB. No Vite chunk warning remains because the isolated Phaser chunk is below it.

## Workflow, production, and review evidence

- Implementation Quality `32131618501`: success. Implementation Deploy `32131618658` correctly stopped before deployment when Linux WebKit exposed the missing Menu-readiness wait in the new release test.
- Post-fix Quality `32132913283` / job `95697769522`: success.
- Post-fix Deploy Production `32132913292`: success. Verify and deploy job `95697769569` passed every release gate and deployed in `12m16s`.
- Live production browser matrix job `95700918346`: success in `1m23s`, with five bridge-free tests per engine.
- Verification-record Quality `32135386005`: success. Deploy `32135386071` stopped before artifact upload when Linux WebKit exposed same-Escape delivery from Settings into a newly reconstructed Pause overlay.
- Pause event-loop fix Quality `32137124410` / job `95710966135`: success.
- Pause event-loop fix Deploy Production `32137124419`: success. Verify and deploy job `95710966386` passed every release gate and deployed in `12m18s`; live matrix job `95714465817` then passed in `1m36s`.
- Local/live visual review passed at `1440 × 900`, `1024 × 640`, `960 × 540`, `720 × 700`, and `390 × 844` across Chromium WebGL, Chromium Canvas, Firefox, and WebKit. Menu, onboarding, Settings, Manual, Pause, active play, floor presentation, responsive framing, version display, and fatal renderer guidance showed no clipping, stale state, accidental scroll, or horizontal overflow.
- Production review at `https://meiirorazalin.com/?seed=v1-production-review` showed `v1.0.0`, successful real run start, correct Chromium/Firefox/WebKit rendering, reachable local audio, no mixed content, no external runtime request, and no production bridge, Canvas override, or lifecycle diagnostics.
- Production architecture remains root-based Vite, dist-only workflow Pages deployment from `main`, canonical `meiirorazalin.com`, enforced HTTPS, and `PRODUCTION_DOMAIN_READY=true`; DNS, Pages, certificate, homepage, and repository variables were not changed.

## Known limitations and release intent

- Keyboard and pointer landscape play are primary; portrait remains readable and recommends landscape but has no virtual controls.
- Audio may degrade silently. Fullscreen is optional. Run progress intentionally does not persist.
- WebKit is automated Safari-family evidence rather than exhaustive Safari/device coverage.
- No controller, offline, service-worker, boss, trap, score, save, backend, analytics, or new gameplay system was added.
- Annotated `v1.0.0` and the non-draft, non-prerelease `Dungeon Escape v1.0.0` GitHub Release are created only after the verification-record commit passes the same final deployment and live-matrix gate.

Historical published targets remain:

- `v0.7.0` → `7dc2c37c53cf2d7fbd1b0eea0908229ad388fd8a`
- `v0.6.0` → `97b15629875c5ae664fe49e988eafbbf0a60518e`
- `v0.5.0` → `944780aee6c2c592ccbfc6855126a41d47d0a561`
- `v0.4.1` → `fdeea817472b3a8c5db41b2d331373a3a97ebe33`
- `v0.4.0` → `b7dd859e6b2106e5f17066d38d55f5bba2514529`
- `v0.3.0` → `bb29079df58b32645278e0843f6cd6ed2966b46e`
- `v0.2.0` → `8f704df17d79cadb26b6e17834075814f1dd11ee`
- `v0.1.0` → `819765fd0d5b80c1c3f083700f0f82112deecc`

---

## Published Phase 7 release

- **Version:** `v0.7.0`
- **Phase:** Phase 7 — Presentation, Audio, Accessibility, and Balancing
- **State:** Complete, verified, deployed, and published
- **Canonical production URL:** `https://meiirorazalin.com/`
- **Phase 7 implementation commit:** `71beaf465c64b0e19f39b6568e638cff3c9d8299`
- **Focused fix commits:**
  - `713db18af5f24dbcce1ba0be67e5bcaa2908ac43` — defer Pause-overlay keyboard registration past the opening Escape event
  - `1b913b7d8b18f39dc7c254a79fde031201c25f4e` — arm the real-dash E2E observer before its 130 ms transient state begins
  - `8c00e93c40084daeb1f18845857365237d0fd7d9` — give the three-cycle real defeat-control composite test its explicit CI time budget without changing its assertions
  - `21c808f8882818f8dc2cf4cd1ea3dbfb9f2421cb` — replace live `networkidle` dependence with explicit canvas/application readiness while retaining metadata, asset, redirect, startup, diagnostics, and bridge-isolation checks

The previously published Phase 6 release is annotated tag `v0.6.0` at peeled target `97b15629875c5ae664fe49e988eafbbf0a60518e`. Its production configuration remains unchanged: Vite base `/`, workflow Pages deployment of `dist` from `main`, verified `meiirorazalin.com`, approved certificate, enforced HTTPS, `PRODUCTION_DOMAIN_READY=true`, and bridge-free live smoke after deploy.

## Completed Phase 7 scope

- Original deterministic synthesis produces three floor ambience loops and nineteen event effects under `public/audio/`. All 22 files are mono 16-bit PCM WAV at 22,050 Hz; the SHA-256 manifest and separate audio audit enforce identity, duration, format, and the 3.5 MB budget.
- One game-owned `AudioDirector` performs gesture unlock, silent fallback, immediate volume/mute application, a 450 ms single-voice fade-through-silence between floor ambience, Pause/visibility suspension, deterministic ten-voice SFX budgeting, accepted-event routing, and destruction cleanup.
- Presentation preferences use `dungeon-escape.presentation.v1`; onboarding uses `dungeon-escape.onboarding.v1`. Defaults are master `0.80`, ambience `0.35`, effects `0.75`, unmuted, normal motion, shake enabled, normal contrast, and normal text. Reduced-motion media preference is used only without a stored setting.
- Storage parsing/writes are guarded. Only presentation/onboarding preferences persist; run seed progress, floor, health, shards, upgrades, objectives, enemies, timers, fingerprints, and statistics never persist.
- Menu exposes Start Run, How to Play, Settings, and Fullscreen. The reusable first-run Field Manual has exactly four sections and blocks timers/world updates until closed. Settings can reset onboarding.
- Escape Pause and focus/page-hidden Pause freeze the exact physics/runtime, projectiles and lifetime, AI/telegraphs, combat/vitality timers, pickups, gameplay tweens, and floor/run timers. Focus return never resumes automatically. Manual/Settings route back to Pause, and Replay Floor/New Run use the existing semantics.
- Quick controls are <kbd>M</kbd> mute, <kbd>H</kbd> manual, <kbd>F</kbd> guarded fullscreen, and <kbd>Escape</kbd> Pause. Input-repeat, listener, overlay, and rejected-fullscreen paths are guarded.
- Reduced motion suppresses shake/nonessential motion and lowers the transient cap from `96` to `48`. Screen shake, high contrast, and large text apply without changing gameplay/planning.
- Enemy health bars are dormant-hidden, engagement/damage-visible, high-contrast aware, wider for Wardens, and destroyed at death/transition. Low-health presentation begins at health `2` and clears after healing above two or a terminal state.
- The exact balance adjustment is one `450 ms` first-discovery awakening per enemy/floor attempt. Enemies cannot move, damage, telegraph, fire, wind up, charge, or attack during it. Replay restores eligibility.
- Base combat/planning remains exact: enemy damage `1`, Wisp telegraph `350 ms`, Warden wind-up `550 ms`, Phase 6 depth profiles unchanged, and no layout/objective/encounter/loot/run fingerprint meaning changed.
- Floor titles, refined accepted-event audio/effects, high-contrast minimap/HUD/prompt treatment, large important text, and the portrait landscape recommendation preserve the logical `960 × 540` canvas.
- Rollup isolates Phaser in one `phaser-vendor-*` chunk. Application code remains separate and under the 350 kB target; `chunkSizeWarningLimit` remains `1,500` kB.

## Preserved behavior and isolation

All Phase 1–6 generation, objective, combat, loot, upgrade, carry, checkpoint, transition, victory, defeat, and deployment contracts remain in force. The game still has exactly three floors and eight upgrades. Phase 7 adds no enemy archetype, weapon, loot, objective, upgrade, boss, trap, score, inventory, equipment, shop, save, run persistence, account, backend, analytics, service worker, virtual controls, controller support, or Phase 8 cross-browser hardening.

The E2E bridge gains only read-only presentation/audio/effect/awakening summaries. It has no direct setting, onboarding, pause, audio, awakening, health, enemy, objective, floor, or run-state mutation action. Production scanning still rejects the bridge global, installer, and every teleport identifier.

## Local verification record

Required commands:

```text
pnpm audio:generate
pnpm format
pnpm install
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm audit:audio
pnpm build
pnpm audit:production
pnpm test:e2e
pnpm check
git diff --check
LIVE_BASE_URL=https://meiirorazalin.com pnpm test:live
```

Verified implementation evidence:

- Unit tests: `304` passed across `19` files, preserving the Phase 6 100-RunPlan/300-floor validation.
- Local Chromium: `43` passed in the final full run, including onboarding, settings, Pause/focus, audio state, awakening/health bars, all existing combat/loot/run paths, responsive behavior, and production bridge isolation. The corrected transient dash observer passed `10 / 10` CI-mode stress repetitions; a one-off browser-startup stall before bridge installation was not reproducible when the unchanged repeated-new-run case passed `3 / 3`, after which the clean full run passed.
- Audio audit: `275` checks passed for `22` files totaling `1,892,860` bytes.
- Production audit: `101` checks passed across `34` deployed files.
- Bundle report: application `205,463` bytes (`53,568` gzip), Phaser vendor `1,374,829` bytes (`355,968` gzip), total JavaScript `1,580,292` bytes (`409,536` gzip), CSS `5,140` bytes (`1,860` gzip). The application chunk is below 350 kB, Phaser appears in exactly one vendor chunk, the warning threshold remains `1,500` kB, and Vite emits no chunk-size warning.
- Live Chromium: the final `5` bridge-free tests passed independently in `1.2` minutes against deployed commit `21c808f8882818f8dc2cf4cd1ea3dbfb9f2421cb`. The suite confirmed canonical metadata and redirects, explicit canvas/application readiness, fixed-seed startup, the production audio manifest and representative ambience/effect assets, stable Menu Settings/How to Play presentation, no external audio, and no production E2E bridge.
- Visual review: passed at `1440 × 900`, `1024 × 640`, `960 × 540`, `720 × 700`, and `390 × 844`. Menu, onboarding, Manual, Settings, Pause, high contrast/large text/reduced motion, all floor introductions/themes, awakening, health bars, low health, Runeforge, Floor Cleared, victory, and defeat were inspected without clipping, modal overlap, page overflow, stale floor presentation, or unreadable HUD/minimap state.
- Audio review: all 22 files played locally at moderate volume. Deterministic waveform inspection measured peaks from `0.1289` to `0.3122`, nonzero RMS, and zero-amplitude boundaries for every file; no clipping or abrupt edge was detected. The three ambience recipes remain distinct, routine effects remain short/subordinate, player hit is clear, and victory/defeat identities differ. All cues retain visual equivalents.

## Known limitations and deferred scope

- Keyboard and pointer landscape play remain primary; portrait receives guidance rather than virtual controls.
- Audio can be blocked/unavailable and then degrades silently; no mechanic depends on it.
- Chromium is the local/CI browser contract. Cross-browser expansion remains Phase 8.
- Phaser remains the dominant JavaScript vendor payload even after correct splitting.
- Presentation preferences persist, but active runs intentionally do not survive reload.

## Workflow and production verification

- Quality workflow run `32106661706`: success for implementation commit `71beaf465c64b0e19f39b6568e638cff3c9d8299`; `quality` job `95617382501` succeeded.
- Deploy Production workflow run `32106661678`: success for the same implementation commit.
- Verify and deploy job `95617382398`: success, including non-browser gates, `43` local Chromium tests, production artifact audit, Pages upload, and deployment.
- Live production smoke job `95618728958`: success; all `5` bridge-free Chromium tests passed after deployment.
- Focused Pause fix `713db18af5f24dbcce1ba0be67e5bcaa2908ac43`: Quality run `32108150537` succeeded. Deploy run `32108150518` stopped before Pages upload when its slower Linux browser job exposed the pre-existing 130 ms dash-observation race; no broken artifact was deployed.
- Focused dash-observer fix `1b913b7d8b18f39dc7c254a79fde031201c25f4e`: Quality run `32109516033` and `quality` job `95625729686` succeeded. Deploy Production run `32109516053`, Verify and deploy job `95625730166`, and live production smoke job `95627587405` all succeeded.
- Verification-record commit `64f9d5982c019ec3bb07bccf1c667efdadd05bde`: Quality run `32110910543` and `quality` job `95629930928` succeeded. Deploy run `32110910586` stopped before artifact audit/upload when Verify and deploy job `95629931383` showed that one composite real-defeat control test needed more than its implicit 30-second default on Linux; Pages and live smoke were correctly skipped.
- Focused composite-test fix `8c00e93c40084daeb1f18845857365237d0fd7d9`: Quality run `32112254316` and `quality` job `95634044154` succeeded. Deploy Production run `32112254296`, Verify and deploy job `95634044066`, and live production smoke job `95636419275` all succeeded without changing gameplay or assertions.
- Focused live-readiness fix `21c808f8882818f8dc2cf4cd1ea3dbfb9f2421cb`: Quality run `32122480871` and `quality` job `95665742021` succeeded. Deploy Production run `32122480869`, Verify and deploy job `95665742204`, and live production smoke job `95667966579` all succeeded. The live suite now uses bounded explicit canvas/application readiness instead of waiting for every Phase 7 audio request to leave the network idle.
- Independent post-deploy command `LIVE_BASE_URL=https://meiirorazalin.com pnpm test:live`: `5 / 5` passed in `1.2` minutes against the final focused-fix deployment.
- Live review at `https://meiirorazalin.com/?seed=phase7-production-review`: canonical HTTPS presentation loaded at `720 × 700`; the Phase 7 Menu, Settings, How to Play, and Fullscreen controls rendered without overflow or clipping, and the automated diagnostics found no failed assets, mixed content, external audio request, autoplay exception, development overlay, or production bridge.
- Production architecture remains Vite base `/`, dist-only workflow Pages deployment from `main`, canonical `meiirorazalin.com`, enforced HTTPS, and `PRODUCTION_DOMAIN_READY=true`; no DNS, Pages, certificate, homepage, or repository-variable setting changed.

The annotated `v0.7.0` release is published at peeled target `7dc2c37c53cf2d7fbd1b0eea0908229ad388fd8a` with message `Phase 7: presentation audio and balancing`.

## Phase 7 historical tags

Published targets remain unchanged:

- `v0.7.0` → `7dc2c37c53cf2d7fbd1b0eea0908229ad388fd8a`
- `v0.6.0` → `97b15629875c5ae664fe49e988eafbbf0a60518e`
- `v0.5.0` → `944780aee6c2c592ccbfc6855126a41d47d0a561`
- `v0.4.1` → `fdeea817472b3a8c5db41b2d331373a3a97ebe33`
- `v0.4.0` → `b7dd859e6b2106e5f17066d38d55f5bba2514529`
- `v0.3.0` → `bb29079df58b32645278e0843f6cd6ed2966b46e`
- `v0.2.0` → `8f704df17d79cadb26b6e17834075814f1dd11ee`
- `v0.1.0` → `819765fd0d5b80c1c3f083700f0f82112deecc`
