export type UpgradeId =
  | "tempered-edge"
  | "long-reach"
  | "quickened-steel"
  | "fleet-sigil"
  | "vital-rune"
  | "aegis-rune"
  | "windstep-sigil"
  | "stalwart-rune";

export interface UpgradeDefinition {
  readonly id: UpgradeId;
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly effectSummary: string;
  readonly displayOrder: number;
}

export interface EffectivePlayerStats {
  readonly meleeDamage: number;
  readonly meleeRange: number;
  readonly meleeArcDegrees: number;
  readonly attackWindUpMs: number;
  readonly attackActiveMs: number;
  readonly attackRecoveryMs: number;
  readonly attackCooldownMs: number;
  readonly dashSpeed: number;
  readonly dashDurationMs: number;
  readonly dashCooldownMs: number;
  readonly maximumHealth: number;
  readonly postHitInvulnerabilityMs: number;
  readonly movementSpeedMultiplier: number;
  readonly hitStunMs: number;
  readonly playerKnockbackMs: number;
}

export interface UpgradeOffer {
  readonly floorNumber: 1 | 2 | 3;
  readonly index: number;
  readonly fingerprint: string;
  readonly upgradeIds: readonly UpgradeId[];
}
