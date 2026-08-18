# Dungeon Escape v1.0.0

**[Play Dungeon Escape online](https://meiirorazalin.com/)**

Dungeon Escape is a complete deterministic dark-fantasy browser action game. One URL seed plans three reproducible floors—THE SHIFTING CATACOMBS, THE EMBER VAULTS, and THE OBSIDIAN SANCTUM—while health, shards, and selected upgrades carry through the run.

Find each Runic Key and open its Ancient Gate. Fight optional Bone Stalkers, Ash Wisps, and Stone Wardens with directional sword attacks and dash. Open deterministic Treasure Chests, collect Runic Shards and immediate Vitality Flasks, and spend at each Runeforge on three-card offers from eight one-time upgrades. Floors 1 and 2 descend through Floor Cleared transitions; Floor 3 concludes in victory, while defeat ends the whole run.

The release includes three original generated ambience identities, nineteen event effects, exact-state Pause and focus-loss pause, presentation Settings, first-run onboarding, a four-section Field Manual, fullscreen, mute/volume controls, reduced motion, shake control, high contrast, large text, health bars, low-health feedback, and a fair 450 ms first-discovery enemy awakening cue.

v1.0.0 hardens the unchanged game across pinned Chromium, Firefox, and WebKit engines. Production prefers WebGL through Phaser.AUTO and falls back to Canvas. Audio, localStorage, and fullscreen are optional and fail gracefully; missing both renderers shows friendly reload guidance. Release audits enforce JavaScript, audio, deployed-site, lifecycle, and isolation budgets.

Controls: WASD/arrows move; Space/J/click attacks; Shift dashes; E interacts; Escape pauses; H opens the Field Manual; M toggles mute; F requests fullscreen; R replays the active floor checkpoint (or the whole same-seed run after a terminal outcome); N creates a new run.

Keyboard and pointer landscape play are primary. Portrait is readable but has no virtual controls. Run state never persists across reload. This release does not include bosses, traps, scores, save games, controller/touch controls, accounts, backend services, or offline mode.

The production game deploys as a verified dist-only GitHub Pages artifact at the canonical HTTPS domain. Release evidence includes unit/planning tests, deep Chromium gameplay tests, the three-engine core and live matrices, forced-Canvas tests, lifecycle soak, audio audit, production audit, release audit, accessibility contrast validation, and bounded size checks.
