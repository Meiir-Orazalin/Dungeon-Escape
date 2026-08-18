import { COMBAT_CONFIG } from "../combat/config";
import { isUpgradeId, stableUpgradeIds } from "./catalog";
import type { EffectivePlayerStats, UpgradeId } from "./types";

export const BASE_PLAYER_STATS: EffectivePlayerStats = Object.freeze({
  meleeDamage: COMBAT_CONFIG.attackDamage,
  meleeRange: COMBAT_CONFIG.attackRange,
  meleeArcDegrees: COMBAT_CONFIG.attackArcDegrees,
  attackWindUpMs: COMBAT_CONFIG.attackWindUpMs,
  attackActiveMs: COMBAT_CONFIG.attackActiveMs,
  attackRecoveryMs: COMBAT_CONFIG.attackRecoveryMs,
  attackCooldownMs: COMBAT_CONFIG.attackCooldownMs,
  dashSpeed: COMBAT_CONFIG.dashSpeed,
  dashDurationMs: COMBAT_CONFIG.dashDurationMs,
  dashCooldownMs: COMBAT_CONFIG.dashCooldownMs,
  maximumHealth: COMBAT_CONFIG.playerMaximumHealth,
  postHitInvulnerabilityMs: COMBAT_CONFIG.postDamageInvulnerabilityMs,
  movementSpeedMultiplier: 1,
  hitStunMs: COMBAT_CONFIG.hitStunMs,
  playerKnockbackMs: COMBAT_CONFIG.playerKnockbackMs,
});

export function deriveEffectivePlayerStats(ids: readonly string[]): EffectivePlayerStats {
  if (ids.length > 6) throw new RangeError("A three-floor run supports at most six upgrades.");
  if (new Set(ids).size !== ids.length)
    throw new RangeError("Selected upgrade IDs must be unique.");
  if (!ids.every(isUpgradeId)) throw new RangeError("Selected upgrades contain an unknown ID.");
  const selected = new Set<UpgradeId>(stableUpgradeIds(ids as readonly UpgradeId[]));
  const stats: EffectivePlayerStats = Object.freeze({
    ...BASE_PLAYER_STATS,
    meleeDamage: selected.has("tempered-edge") ? 2 : BASE_PLAYER_STATS.meleeDamage,
    meleeRange: selected.has("long-reach") ? 76 : BASE_PLAYER_STATS.meleeRange,
    attackRecoveryMs: selected.has("quickened-steel") ? 75 : BASE_PLAYER_STATS.attackRecoveryMs,
    attackCooldownMs: selected.has("quickened-steel") ? 260 : BASE_PLAYER_STATS.attackCooldownMs,
    dashCooldownMs: selected.has("fleet-sigil") ? 650 : BASE_PLAYER_STATS.dashCooldownMs,
    maximumHealth: selected.has("vital-rune") ? 6 : BASE_PLAYER_STATS.maximumHealth,
    postHitInvulnerabilityMs: selected.has("aegis-rune")
      ? 1_150
      : BASE_PLAYER_STATS.postHitInvulnerabilityMs,
    movementSpeedMultiplier: selected.has("windstep-sigil") ? 1.15 : 1,
    hitStunMs: selected.has("stalwart-rune") ? 90 : BASE_PLAYER_STATS.hitStunMs,
    playerKnockbackMs: selected.has("stalwart-rune") ? 80 : BASE_PLAYER_STATS.playerKnockbackMs,
  });
  const numericValues = Object.values(stats);
  if (!numericValues.every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError("Effective player stats must be finite and positive.");
  }
  const attackDuration = stats.attackWindUpMs + stats.attackActiveMs + stats.attackRecoveryMs;
  if (stats.attackCooldownMs < attackDuration) {
    throw new RangeError("Effective attack cooldown cannot be shorter than the attack duration.");
  }
  if (stats.dashCooldownMs < stats.dashDurationMs) {
    throw new RangeError("Effective dash cooldown cannot be shorter than the active dash.");
  }
  if (!Number.isInteger(stats.meleeDamage) || !Number.isInteger(stats.maximumHealth)) {
    throw new RangeError("Effective damage and maximum health must be integers.");
  }
  return stats;
}
