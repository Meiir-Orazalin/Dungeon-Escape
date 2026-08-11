export const COMBAT_CONFIG = Object.freeze({
  playerMaximumHealth: 5,
  damagePerHit: 1,
  postDamageInvulnerabilityMs: 850,
  hitStunMs: 130,
  playerKnockbackSpeed: 250,
  playerKnockbackMs: 120,
  attackDamage: 1,
  attackRange: 58,
  attackArcDegrees: 110,
  attackWindUpMs: 45,
  attackActiveMs: 80,
  attackRecoveryMs: 105,
  attackCooldownMs: 330,
  enemyKnockbackSpeed: 210,
  enemyKnockbackMs: 120,
  dashSpeed: 600,
  dashDurationMs: 130,
  dashCooldownMs: 900,
  maximumDeltaMs: 100,
  defeatTransitionMs: 360,
});

export function safeDelta(delta: number): number {
  if (!Number.isFinite(delta) || delta <= 0) return 0;
  return Math.min(delta, COMBAT_CONFIG.maximumDeltaMs);
}
