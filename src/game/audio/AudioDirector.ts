import Phaser from "phaser";

import type { PresentationSettings } from "../presentation/settings";
import { AUDIO_CROSSFADE_MS, AUDIO_EFFECT_VOICE_CAP } from "./config";
import { ambienceForFloor } from "./floorAmbience";
import type { AudioEffectId, FloorAmbienceId } from "./types";
import { deriveEffectiveAudioGains } from "./volume";
import { decideEffectVoice, type EffectVoice } from "./voiceBudget";
import type { FloorNumber } from "../run/types";

export const AUDIO_DIRECTOR_REGISTRY_KEY = "audio-director";

interface ActiveEffect {
  readonly descriptor: EffectVoice;
  readonly sound: Phaser.Sound.BaseSound;
}

export interface AudioDirectorSnapshot {
  readonly supported: boolean;
  readonly unlocked: boolean;
  readonly muted: boolean;
  readonly currentAmbienceId: FloorAmbienceId | null;
  readonly activeAmbienceCount: number;
  readonly activeEffectVoiceCount: number;
  readonly peakEffectVoiceCount: number;
}

function setSoundVolume(sound: Phaser.Sound.BaseSound, volume: number): void {
  if (
    sound instanceof Phaser.Sound.WebAudioSound ||
    sound instanceof Phaser.Sound.HTML5AudioSound
  ) {
    sound.setVolume(volume);
  }
}

export class AudioDirector {
  private settings: PresentationSettings;
  private unlocked = false;
  private desiredAmbience: FloorAmbienceId | null = null;
  private ambienceId: FloorAmbienceId | null = null;
  private ambience: Phaser.Sound.BaseSound | null = null;
  private effects: ActiveEffect[] = [];
  private sequence = 0;
  private peakEffectVoiceCount = 0;
  private paused = false;
  private crossfadeTimers = new Set<ReturnType<typeof globalThis.setTimeout>>();
  private readonly lastRateLimitedAt = new Map<AudioEffectId, number>();
  private readonly supported: boolean;

  public constructor(
    private readonly game: Phaser.Game,
    settings: PresentationSettings,
  ) {
    this.settings = settings;
    this.supported = !(game.sound instanceof Phaser.Sound.NoAudioSoundManager);
    game.events.once(Phaser.Core.Events.DESTROY, this.destroy, this);
  }

  public applySettings(settings: PresentationSettings): void {
    this.settings = settings;
    const gains = deriveEffectiveAudioGains(settings);
    if (this.ambience) setSoundVolume(this.ambience, gains.ambience);
    this.effects.forEach(({ sound }) => setSoundVolume(sound, gains.effects));
  }

  public unlock(): boolean {
    if (this.unlocked) return true;
    if (!this.supported) return false;
    try {
      this.game.sound.unlock();
      this.unlocked = true;
      if (this.desiredAmbience && !this.paused) this.startDesiredAmbience();
      return true;
    } catch {
      this.unlocked = false;
      return false;
    }
  }

  public setFloorAmbience(floor: FloorNumber): void {
    this.desiredAmbience = ambienceForFloor(floor);
    if (this.unlocked && !this.paused) this.startDesiredAmbience();
  }

  public playEffect(id: AudioEffectId, critical = false): boolean {
    const presentationEffect = id === "ui-focus" || id === "ui-confirm" || id === "ui-back";
    if (!this.unlocked || !this.supported || (this.paused && !presentationEffect)) return false;
    const now = this.game.loop.time;
    if (id === "ui-focus" || id === "shard-collected") {
      const previous = this.lastRateLimitedAt.get(id) ?? -Infinity;
      if (now - previous < 80) return false;
      this.lastRateLimitedAt.set(id, now);
    }
    this.effects = this.effects.filter(({ sound }) => sound.isPlaying || sound.isPaused);
    const decision = decideEffectVoice(
      this.effects.map(({ descriptor }) => descriptor),
      AUDIO_EFFECT_VOICE_CAP,
      critical,
    );
    if (decision.action === "reject") return false;
    if (decision.action === "replace") {
      const victim = this.effects.find(({ descriptor }) => descriptor.id === decision.voiceId);
      victim?.sound.stop();
      victim?.sound.destroy();
      this.effects = this.effects.filter(({ descriptor }) => descriptor.id !== decision.voiceId);
    }
    try {
      const sound = this.game.sound.add(id, {
        volume: deriveEffectiveAudioGains(this.settings).effects,
      });
      const descriptor = Object.freeze({
        id: this.sequence,
        critical,
        startedSequence: this.sequence,
      });
      this.sequence += 1;
      const active = { descriptor, sound };
      this.effects.push(active);
      this.peakEffectVoiceCount = Math.max(this.peakEffectVoiceCount, this.effects.length);
      sound.once(Phaser.Sound.Events.COMPLETE, () => this.releaseEffect(descriptor.id));
      sound.once(Phaser.Sound.Events.STOP, () => this.releaseEffect(descriptor.id));
      if (!sound.play()) {
        this.releaseEffect(descriptor.id);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  public pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.cancelCrossfade();
    if (this.ambience?.isPlaying) this.ambience.pause();
    this.effects.forEach(({ sound }) => {
      if (sound.isPlaying) sound.pause();
    });
  }

  public resume(): void {
    if (!this.paused) return;
    this.paused = false;
    if (!this.unlocked) return;
    if (this.ambience?.isPaused) this.ambience.resume();
    this.startDesiredAmbience();
    this.effects.forEach(({ sound }) => {
      if (sound.isPaused) sound.resume();
    });
  }

  public stopAmbience(): void {
    this.cancelCrossfade();
    this.ambience?.stop();
    this.ambience?.destroy();
    this.ambience = null;
    this.ambienceId = null;
  }

  public getSnapshot(): AudioDirectorSnapshot {
    return Object.freeze({
      supported: this.supported,
      unlocked: this.unlocked,
      muted: this.settings.muted,
      currentAmbienceId: this.ambienceId,
      activeAmbienceCount: this.ambience?.isPlaying || this.ambience?.isPaused ? 1 : 0,
      activeEffectVoiceCount: this.effects.length,
      peakEffectVoiceCount: this.peakEffectVoiceCount,
    });
  }

  public destroy(): void {
    this.game.events.off(Phaser.Core.Events.DESTROY, this.destroy, this);
    this.stopAmbience();
    this.effects.forEach(({ sound }) => {
      sound.stop();
      sound.destroy();
    });
    this.effects = [];
  }

  private startDesiredAmbience(): void {
    if (!this.desiredAmbience || this.paused) return;
    if (
      this.ambience?.key === this.desiredAmbience &&
      (this.ambience.isPlaying || this.ambience.isPaused)
    )
      return;
    this.cancelCrossfade();
    if (!this.ambience) {
      this.createAmbience(this.desiredAmbience, deriveEffectiveAudioGains(this.settings).ambience);
      return;
    }
    const outgoing = this.ambience;
    const targetId = this.desiredAmbience;
    const halfDuration = AUDIO_CROSSFADE_MS / 2;
    const steps = 8;
    for (let step = 1; step <= steps; step += 1) {
      this.scheduleCrossfade((halfDuration * step) / steps, () => {
        setSoundVolume(
          outgoing,
          deriveEffectiveAudioGains(this.settings).ambience * (1 - step / steps),
        );
      });
    }
    this.scheduleCrossfade(halfDuration, () => {
      if (this.ambience !== outgoing) return;
      outgoing.stop();
      outgoing.destroy();
      this.ambience = null;
      this.ambienceId = null;
      if (this.paused || this.desiredAmbience !== targetId) return;
      const incoming = this.createAmbience(targetId, 0);
      if (!incoming) return;
      for (let step = 1; step <= steps; step += 1) {
        this.scheduleCrossfade((halfDuration * step) / steps, () => {
          if (this.ambience !== incoming || this.paused) return;
          setSoundVolume(
            incoming,
            deriveEffectiveAudioGains(this.settings).ambience * (step / steps),
          );
        });
      }
    });
  }

  private createAmbience(id: FloorAmbienceId, volume: number): Phaser.Sound.BaseSound | null {
    try {
      const sound = this.game.sound.add(id, { loop: true, volume });
      if (!sound.play()) {
        sound.destroy();
        return null;
      }
      this.ambience = sound;
      this.ambienceId = id;
      return sound;
    } catch {
      this.ambience = null;
      this.ambienceId = null;
      return null;
    }
  }

  private scheduleCrossfade(delayMs: number, callback: () => void): void {
    const timer = globalThis.setTimeout(() => {
      this.crossfadeTimers.delete(timer);
      callback();
    }, delayMs);
    this.crossfadeTimers.add(timer);
  }

  private cancelCrossfade(): void {
    this.crossfadeTimers.forEach((timer) => globalThis.clearTimeout(timer));
    this.crossfadeTimers.clear();
  }

  private releaseEffect(id: number): void {
    const active = this.effects.find(({ descriptor }) => descriptor.id === id);
    if (!active) return;
    this.effects = this.effects.filter(({ descriptor }) => descriptor.id !== id);
    if (active.sound.manager) active.sound.destroy();
  }
}

export function getAudioDirector(scene: Phaser.Scene): AudioDirector {
  const director = scene.registry.get(AUDIO_DIRECTOR_REGISTRY_KEY) as unknown;
  if (!(director instanceof AudioDirector)) throw new Error("AudioDirector is unavailable.");
  return director;
}
