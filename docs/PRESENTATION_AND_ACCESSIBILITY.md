# Presentation and Accessibility

> Phase 8 integration: the Phase 7 Settings schema, persistence boundaries, Pause semantics, and accessibility preferences are unchanged. Phase 8 verifies them in Chromium, Firefox, WebKit, and Canvas fallback, adds pure contrast checks and friendly fatal boot presentation, and adds no preference or gameplay persistence.

## Phase 7 overview

Phase 7 wraps the complete deterministic three-floor game in a locally owned presentation layer. It adds onboarding, pause, settings, fullscreen, accessibility modes, enemy readability, bounded effects, and one explicit encounter-pacing adjustment. None of these systems enters `RunPlan` creation or any layout, objective, encounter, loot, or run fingerprint.

## Settings and storage

Presentation preferences use the versioned key `dungeon-escape.presentation.v1`. First-run completion uses the separate key `dungeon-escape.onboarding.v1`. The stored settings are:

| Setting         |                                                   Default |
| --------------- | --------------------------------------------------------: |
| Master volume   |                                                    `0.80` |
| Ambience volume |                                                    `0.35` |
| Effects volume  |                                                    `0.75` |
| Muted           |                                                   `false` |
| Reduced motion  | `false` unless an unstored browser preference requests it |
| Screen shake    |                                                    `true` |
| High contrast   |                                                   `false` |
| Large text      |                                                   `false` |

Parsing is pure and defensive. Volumes clamp to `[0, 1]`; non-finite values use defaults; missing fields are filled; unknown fields are ignored; malformed JSON and denied localStorage access fall back without stopping the game. Writes are guarded. Mute preserves individual channel values, and reduced motion suppresses effective screen shake without erasing the stored shake preference.

No seed, floor, health, shards, upgrades, timer, fingerprint, enemy, objective, chest, or statistics state is persisted. Reload always starts a fresh Floor 1 run.

## Menu, onboarding, and Field Manual

The menu exposes **Start Run**, **How to Play**, **Settings**, and **Fullscreen**, plus the quick controls <kbd>M</kbd>, <kbd>H</kbd>, and <kbd>F</kbd>. The first real start in a browser profile opens the manual before either game timer or world simulation advances. Completing or skipping it records only the onboarding completion flag. Settings can reset that flag.

The reusable Field Manual has exactly four sections:

1. **Movement and Combat** — movement, attacks, dash, health, and Pause.
2. **The Escape** — Runic Key, Ancient Gate, <kbd>E</kbd>, and optional enemies.
3. **Loot and the Runeforge** — chests, shards, flasks, costs, and carried upgrades.
4. **The Three-Floor Run** — depth, carry state, active checkpoint replay, terminal replay, and new runs.

Arrow keys and pointer controls change sections. Enter/Space advances, and Escape returns to Menu, Pause, or active play according to the opening context. The close event cannot leak into an attack because gameplay remains suspended until the modal closes.

## Pause and modal state

Escape opens **RUN PAUSED** only for `active + playing`. Blur or document hiding requests the same pause once; focus return never resumes automatically. Physics, player/enemy AI, projectile movement/lifetime, attack/dash/vitality timers, pickups, gameplay tweens, and both run timers remain frozen. Resume does not heal, spend, reset a cooldown, alter an objective, mutate a checkpoint, or create a floor summary.

Pause offers Resume, Field Manual, Settings, Replay Current Floor, New Run, and Fullscreen. Destructive replay/new-run actions require deliberate pointer selection; <kbd>R</kbd> and <kbd>N</kbd> are not Pause shortcuts. Settings and Manual opened from Pause return to Pause.

The pure presentation-modal union permits exactly one of `none`, `pause`, `manual`, or `settings`. It stays separate from `RunOutcome` and active run activity. Pause cannot coexist with Runeforge choice, Floor Cleared, Victory, or Defeat; shutdown always restores `none`.

## Presentation controls

- <kbd>Escape</kbd>: pause active gameplay; retains overlay-specific back behavior.
- <kbd>M</kbd>: toggle mute without browser-repeat duplication.
- <kbd>H</kbd>: open the Field Manual; active gameplay is suspended first.
- <kbd>F</kbd>: request or exit fullscreen from a user gesture.

Unsupported or rejected Fullscreen API requests are caught and announced without an uncaught error.

## Accessibility modes

Reduced motion disables effective shake, continuous pickup/decoration motion where supported, low-health pulsation, and most nonessential particles. Its transient-effect cap is `48` instead of `96`; gameplay timing and collision do not change.

Screen shake is mild and limited to accepted player damage, Warden impacts, floor clear, victory, and defeat. The stored toggle and reduced-motion override both suppress it.

High contrast strengthens panel borders, text separation, health bars, interaction prompts, minimap marker outlines, cards, and modal framing. It uses shape and line-weight differences as well as color and never changes theme identity or collision.

Large text scales important menu, modal, Runeforge, prompt, and HUD values by approximately 12–15%. Layout remains the logical `960 × 540` and no page scroll is introduced.

## Enemy and health readability

Each discovered engaged enemy owns one programmatic health bar; accepted damage keeps it visible for 1.5 seconds. Dormant/dead enemies hide it. The Stone Warden bar is wider, and high contrast adds stronger separation. Bars have no physics and are destroyed with the enemy manager.

The only Phase 7 balance change is a one-time `450 ms` awakening after first discovery per enemy and floor attempt. During awakening the enemy is visible but cannot move, contact-damage, telegraph, fire, wind up, charge, or otherwise attack. Leaving consumes the same one-time grace; returning never repeats it. Current-floor replay, a fresh floor, whole-run replay, and a new run recreate eligibility. Encounter plans, fingerprints, base stats, damage `1`, Wisp telegraph `350 ms`, and Warden wind-up `550 ms` remain unchanged.

Health `2` or lower while alive shows a restrained edge vignette and clear HUD state. Healing above two clears it immediately. Reduced motion removes pulsation; terminal outcomes clear the active state. No regeneration or damage change exists.

## Floor intro and effect budget

Every floor entry shows a camera-fixed floor number and name for about 1.2 seconds. Reduced motion uses a shorter static fade. The intro does not block gameplay after onboarding, advance either timer specially, change the URL, or survive replay/transition cleanup.

Transient programmatic effects are coordinated through a bounded pool. Normal mode caps active effects at `96`; reduced motion caps them at `48` and lowers motion/count. Overflow deterministically recycles the oldest active presentation object. Effects have no physics and shutdown clears the pool.

## Responsive behavior and announcements

The page retains aspect-ratio fitting and centered `960 × 540` canvas rendering at 1440 × 900, 1024 × 640, 960 × 540, 720 × 700, and 390 × 844. Portrait shows the non-blocking recommendation “Best played in landscape with keyboard and pointer.” No virtual controls or full touch-play claim is added.

The existing aria-live channel announces onboarding, pause/resume, manual/settings, mute/fullscreen outcomes, useful awakening events, low-health transitions, floor starts/clears, victory, and defeat once. It does not announce every frame, health-bar update, audio event, UI focus, effect, or minimap redraw. Every audio cue retains an equivalent visual state.

## E2E and production isolation

E2E snapshots expose read-only settings, modal/pause/timer state, audio counts, effect counts, low-health state, health-bar count, and ordered awakening summaries. Tests still use real menu/modal/settings/input and constrained player teleportation. There are no direct setting, onboarding, pause, audio, awakening, health, or run-state mutation actions.

Production continues excluding the bridge global, installer, and every teleport identifier. Settings, pause, audio, and awakening names may appear because they are real production concepts.

## Deferred presentation work

Phase 7 adds no key rebinding, controller support, virtual mobile controls, cross-browser CI expansion, boss presentation, traps, score, save/resume UI, licensed media, analytics, service worker, or Phase 8 release hardening.
