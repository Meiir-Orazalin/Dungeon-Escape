import { COMBAT_CONFIG } from "../combat/config";
import { ENEMY_ARCHETYPE_CONFIG } from "../encounters/config";
import type { EnemyArchetype } from "../encounters/types";
import { ASH_WISP_CONFIG, BONE_STALKER_CONFIG, STONE_WARDEN_CONFIG } from "../enemies/enemyConfig";
import type { EffectiveEnemyStats, FloorDifficultyProfile, FloorNumber } from "./types";

export const FLOOR_DIFFICULTIES: readonly FloorDifficultyProfile[] = Object.freeze([
  Object.freeze({
    id: "depth-1",
    enemyMaximumHealthBonus: 0,
    enemyMovementSpeedMultiplier: 1,
    enemyActionCooldownMultiplier: 1,
    ashWispProjectileSpeedMultiplier: 1,
    stoneWardenChargeSpeedMultiplier: 1,
  }),
  Object.freeze({
    id: "depth-2",
    enemyMaximumHealthBonus: 1,
    enemyMovementSpeedMultiplier: 1.08,
    enemyActionCooldownMultiplier: 0.92,
    ashWispProjectileSpeedMultiplier: 1.1,
    stoneWardenChargeSpeedMultiplier: 1.1,
  }),
  Object.freeze({
    id: "depth-3",
    enemyMaximumHealthBonus: 2,
    enemyMovementSpeedMultiplier: 1.16,
    enemyActionCooldownMultiplier: 0.84,
    ashWispProjectileSpeedMultiplier: 1.2,
    stoneWardenChargeSpeedMultiplier: 1.2,
  }),
]);

export function getFloorDifficulty(floorNumber: FloorNumber): FloorDifficultyProfile {
  const profile = FLOOR_DIFFICULTIES[floorNumber - 1];
  if (!profile) throw new RangeError(`No difficulty profile exists for floor ${floorNumber}.`);
  return profile;
}

function finitePositive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be finite and positive.`);
  }
  return value;
}

export function deriveEffectiveEnemyStats(
  archetype: EnemyArchetype,
  profile: FloorDifficultyProfile,
): EffectiveEnemyStats {
  const multipliers = [
    profile.enemyMovementSpeedMultiplier,
    profile.enemyActionCooldownMultiplier,
    profile.ashWispProjectileSpeedMultiplier,
    profile.stoneWardenChargeSpeedMultiplier,
  ];
  if (!Number.isInteger(profile.enemyMaximumHealthBonus) || profile.enemyMaximumHealthBonus < 0) {
    throw new RangeError("Enemy maximum-health bonus must be a non-negative integer.");
  }
  if (!multipliers.every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError("Enemy difficulty multipliers must be finite and positive.");
  }
  const base = ENEMY_ARCHETYPE_CONFIG[archetype];
  const movementBase =
    archetype === "bone-stalker"
      ? BONE_STALKER_CONFIG.movementSpeed
      : archetype === "ash-wisp"
        ? ASH_WISP_CONFIG.movementSpeed
        : STONE_WARDEN_CONFIG.movementSpeed;
  const stats: EffectiveEnemyStats = Object.freeze({
    archetype,
    maximumHealth: base.maxHealth + profile.enemyMaximumHealthBonus,
    movementSpeed: movementBase * profile.enemyMovementSpeedMultiplier,
    postContactRecoveryMs: 0,
    wispInitialShotDelayMs:
      ASH_WISP_CONFIG.initialShotDelayMs * profile.enemyActionCooldownMultiplier,
    wispShotCooldownMs: ASH_WISP_CONFIG.shotCooldownMs * profile.enemyActionCooldownMultiplier,
    wispTelegraphMs: ASH_WISP_CONFIG.shotTelegraphMs,
    wispProjectileSpeed: ASH_WISP_CONFIG.projectileSpeed * profile.ashWispProjectileSpeedMultiplier,
    wardenWindUpMs: STONE_WARDEN_CONFIG.chargeWindUpMs,
    wardenRecoveryMs: STONE_WARDEN_CONFIG.recoveryMs * profile.enemyActionCooldownMultiplier,
    wardenChargeSpeed: STONE_WARDEN_CONFIG.chargeSpeed * profile.stoneWardenChargeSpeedMultiplier,
    enemyDamage: COMBAT_CONFIG.damagePerHit,
  });
  Object.entries(stats).forEach(([key, value]) => {
    if (key !== "archetype" && key !== "postContactRecoveryMs") {
      finitePositive(value as number, `Effective enemy ${key}`);
    }
  });
  if (!Number.isInteger(stats.maximumHealth)) {
    throw new RangeError("Effective enemy maximum health must be an integer.");
  }
  return stats;
}
