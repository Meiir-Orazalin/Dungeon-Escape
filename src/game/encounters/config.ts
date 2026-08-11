import type { EnemyArchetype } from "./types";

export const ENCOUNTER_CONFIG = Object.freeze({
  contractVersion: 1,
  clearanceRadiusTiles: 1,
  minimumObjectSeparation: 80,
  boneStalkerWeight: 0.45,
  ashWispWeight: 0.3,
  stoneWardenWeight: 0.25,
});

export interface EnemyArchetypeConfig {
  readonly name: string;
  readonly maxHealth: number;
  readonly movementSpeed: number;
  readonly bodyRadius: number;
}

export const ENEMY_ARCHETYPE_CONFIG: Readonly<Record<EnemyArchetype, EnemyArchetypeConfig>> =
  Object.freeze({
    "bone-stalker": Object.freeze({
      name: "Bone Stalker",
      maxHealth: 2,
      movementSpeed: 105,
      bodyRadius: 13,
    }),
    "ash-wisp": Object.freeze({
      name: "Ash Wisp",
      maxHealth: 2,
      movementSpeed: 75,
      bodyRadius: 13,
    }),
    "stone-warden": Object.freeze({
      name: "Stone Warden",
      maxHealth: 4,
      movementSpeed: 55,
      bodyRadius: 17,
    }),
  });

export const ENCOUNTER_GAME_OBJECT_NAMES = Object.freeze({
  ENEMY_PREFIX: "enemy:",
  PROJECTILE_PREFIX: "ash-projectile:",
});
