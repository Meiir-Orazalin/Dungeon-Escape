# Audio System

> Phase 8 integration: the existing 22-file, 1,892,860-byte generated set is unchanged. WAV loading begins non-blockingly after the menu renders, decode/request failures preserve silent playability, and the release/live browser matrices verify the contract. The one-ambience, ten-SFX, pause/visibility, format, ownership, and size rules remain intact.

## Original generated-audio policy

All Dungeon Escape audio is original, repository-owned, and synthesized by `scripts/generate-audio-assets.mjs`. The generator uses only built-in Node modules, stable hashes, deterministic oscillator/noise functions, finite envelopes, and clamped PCM conversion. It uses no sample, recording, spoken word, external tool, FFmpeg, system synthesizer, downloaded asset, recognizable melody, or third-party audio package.

`pnpm audio:generate` writes the committed source assets under `public/audio/`. Re-running the generator in the supported environment produces byte-equivalent WAV files and manifest. Generation is deliberate and does not run on every build.

## Files and format

The three ambience loops are:

- `ambience-catacombs.wav` — low stone resonance, sparse air, restrained pulse;
- `ambience-ember-vaults.wav` — basalt hum, filtered furnace noise, sparse metal;
- `ambience-obsidian-sanctum.wav` — deep drone, controlled movement, pale-rune shimmer.

The nineteen effects are `ui-focus`, `ui-confirm`, `ui-back`, `sword-swing`, `dash`, `enemy-hit`, `enemy-defeat`, `player-hit`, `key-collected`, `gate-sealed`, `gate-ready`, `chest-open`, `shard-collected`, `flask-heal`, `forge-ready`, `upgrade-selected`, `floor-cleared`, `run-victory`, and `run-defeat`.

All 22 files are mono RIFF/WAVE, PCM, 16-bit, and 22,050 Hz. Ambience lasts 10.5, 11, and 11.5 seconds; effects remain between 0.10 and 1.35 seconds. Generated envelopes smooth loop boundaries and effect edges. The manifest records contract version, relative path, kind, sample rate, channels, bit depth, duration, byte size, and SHA-256.

## Manifest and audit

`public/audio/audio-manifest.json` is the authoritative generated record. `pnpm audit:audio` verifies the manifest, every required identity, path uniqueness, RIFF/WAVE and PCM fields, mono/16-bit/22,050 Hz format, duration ranges, exact byte sizes, exact SHA-256 values, three ambience entries, nineteen effects, no external URL, no temporary artifact, and the 3.5 MB total budget. `pnpm check` runs this audit but never regenerates assets.

The production audit independently verifies the deployed manifest, files, WAV signatures, absence of external audio URLs and generation debris, and the same total budget.

## AudioDirector lifecycle

One `AudioDirector` is created in Boot per Phaser game and registered for scenes. It owns unlock state, the single ambience voice, bounded effect voices, volume/mute application, pause/visibility behavior, floor replacement, and game-destruction cleanup. Scenes route accepted gameplay events to it; planners never reference sound.

Audio is unlocked only after a genuine pointer/key gesture. Unsupported audio, autoplay restrictions, decode/play rejection, or other browser failure returns a silent playable fallback with no uncaught error. No gameplay information exists only in sound.

Floor ambience mapping is exact:

| Floor                  | Ambience                    |
| ---------------------- | --------------------------- |
| The Shifting Catacombs | `ambience-catacombs`        |
| The Ember Vaults       | `ambience-ember-vaults`     |
| The Obsidian Sanctum   | `ambience-obsidian-sanctum` |

Floor replacement performs a bounded 450 ms fade-through-silence: outgoing volume falls over 225 ms, the old voice is destroyed, then the incoming voice rises over 225 ms. This preserves the hard active-ambience count of zero or one. Restarting a floor with the same ambience reuses the existing voice.

## Volume and mute

Effective channel gain is `master × channel`. Muted master gain is zero; individual stored values remain unchanged for restoration on unmute. Settings changes apply immediately to active voices. All values are validated and finite.

Pause and hidden-page behavior pause ambience and active gameplay effects. Resume restores them smoothly; focus return itself does not resume gameplay. Presentation UI effects remain available while the Pause UI is active. Victory and defeat play once and stop ambience consistently. Game destruction stops/destroys every owned sound.

## Voice budget and event mapping

At most ten effect voices exist. When full, a new voice deterministically replaces the oldest non-critical voice. If every voice is critical, non-critical input is rejected; an incoming critical victory/defeat event replaces the oldest voice. UI focus and shard collection are rate-limited.

Accepted event mapping covers UI focus/confirm/back, attack start, dash start, enemy hit/death, accepted player damage, key, blocked/ready gate, chest, shard, successful flask heal, ready forge, selected upgrade, floor clear, victory, and defeat. Ignored or duplicate state transitions play nothing.

## Review record

Automated waveform review validates finite/clamped samples, exact PCM format, nonzero durations, bounded amplitude, deterministic digests, and smoothed edges. The three ambience spectra and synthesis recipes are distinct; effects are short and event-specific; no spoken content or imported/copyrighted sample exists. Final manual playback review is recorded in `docs/PHASE_STATUS.md` after the release candidate is verified.

## No external audio

Production serves every audio file from `/audio/` on the canonical origin. There is no audio CDN, streaming request, licensed track, microphone input, speech, analytics hook, backend, service worker, or audio-required mechanic.
