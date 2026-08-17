import type { WorldPoint } from "../dungeon/types";

export interface ForgePlan {
  readonly roomId: number;
  readonly position: WorldPoint;
}

export interface ChestPlan {
  readonly id: string;
  readonly roomId: number;
  readonly position: WorldPoint;
  readonly shardAmount: number;
  readonly containsFlask: boolean;
}

export interface EnemyRewardPlan {
  readonly enemyId: string;
  readonly shardAmount: number;
  readonly containsFlask: boolean;
}

export interface LootPlan {
  readonly fingerprint: string;
  readonly forge: ForgePlan;
  readonly chests: readonly ChestPlan[];
  readonly enemyRewards: readonly EnemyRewardPlan[];
  readonly totalPlannedShards: number;
  readonly guaranteedFlaskCount: number;
}

export interface LootValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export type LootPickupType = "shard" | "flask";

export interface LootPickupSummary {
  readonly id: string;
  readonly type: LootPickupType;
  readonly amount: number;
  readonly position: Readonly<{ x: number; y: number }>;
  readonly active: boolean;
  readonly sourceId: string;
}
