import type Phaser from "phaser";

import type { GameSceneSnapshot } from "../scenes/GameScene";
import { formatRendererType, type RendererName } from "../platform/renderer";

export interface LifecycleDiagnostics {
  readonly rendererType: RendererName;
  readonly activeSceneCount: number;
  readonly gameObjectCount: number;
  readonly staticBodyCount: number;
  readonly dynamicBodyCount: number;
  readonly colliderCount: number;
  readonly keyboardListenerCount: number;
  readonly pointerListenerCount: number;
  readonly windowListenerCount: number;
  readonly visibilityListenerCount: number;
  readonly timerEventCount: number;
  readonly tweenCount: number;
  readonly projectileCount: number;
  readonly pickupCount: number;
  readonly enemyCount: number;
  readonly overlayCount: number;
  readonly ambienceCount: number;
  readonly effectVoiceCount: number;
  readonly transientEffectCount: number;
  readonly effectPoolSize: number;
}

export function nonNegativeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

export function collectLifecycleDiagnostics(
  game: Phaser.Game,
  snapshot: GameSceneSnapshot | null,
): LifecycleDiagnostics {
  const scenes = game.scene.getScenes(true);
  const gameObjectCount = scenes.reduce((total, scene) => total + scene.children.length, 0);
  const gameScene = scenes.find((scene) => scene.scene.key === "GameScene");
  const world = gameScene?.physics?.world;
  const keyboard = gameScene?.input.keyboard;
  const overlayCount = snapshot
    ? [
        snapshot.pauseOverlayVisible,
        snapshot.settingsOverlayVisible,
        snapshot.fieldManualVisible,
        snapshot.floorClearedOverlayVisible,
        snapshot.runVictoryOverlayVisible,
        snapshot.runDefeatOverlayVisible,
        snapshot.upgradeOverlayVisible,
      ].filter(Boolean).length
    : 0;
  return Object.freeze({
    rendererType: formatRendererType(game.renderer?.type),
    activeSceneCount: scenes.length,
    gameObjectCount,
    staticBodyCount: world?.staticBodies.size ?? 0,
    dynamicBodyCount: world?.bodies.size ?? 0,
    colliderCount: world?.colliders.length ?? 0,
    keyboardListenerCount: keyboard?.listenerCount("keydown") ?? 0,
    pointerListenerCount: gameScene?.input.listenerCount("pointerdown") ?? 0,
    windowListenerCount: gameScene ? 1 : 0,
    visibilityListenerCount: gameScene ? 1 : 0,
    timerEventCount: 0,
    tweenCount: scenes.reduce((total, scene) => total + scene.tweens.tweens.length, 0),
    projectileCount: snapshot?.activeEnemyProjectileCount ?? 0,
    pickupCount: snapshot?.pickups.filter((pickup) => pickup.active).length ?? 0,
    enemyCount: snapshot?.aliveEnemyCount ?? 0,
    overlayCount,
    ambienceCount: snapshot?.activeAmbienceCount ?? 0,
    effectVoiceCount: snapshot?.activeEffectVoiceCount ?? 0,
    transientEffectCount: snapshot?.activeTransientEffectCount ?? 0,
    effectPoolSize: snapshot?.activeTransientEffectCount ?? 0,
  });
}
