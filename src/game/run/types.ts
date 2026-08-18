import type { RunOutcome } from "../combat/types";
import type { DungeonLayout } from "../dungeon/types";
import type { EncounterPlan, EnemyArchetype } from "../encounters/types";
import type { LootPlan } from "../loot/types";
import type { EscapeObjectivePlan } from "../objective/types";
import type { UpgradeId } from "../upgrades/types";

export type FloorNumber = 1 | 2 | 3;
export type ActiveRunActivity = "playing" | "choosing-upgrade" | "floor-cleared";

export type FloorThemeId = "shifting-catacombs" | "ember-vaults" | "obsidian-sanctum";
export type FloorDifficultyId = "depth-1" | "depth-2" | "depth-3";

export interface FloorTheme {
  readonly id: FloorThemeId;
  readonly name: string;
  readonly voidColor: number;
  readonly floorColors: readonly number[];
  readonly floorLineColor: number;
  readonly wallColors: readonly number[];
  readonly wallLineColor: number;
  readonly crackColor: number;
  readonly accentColor: number;
  readonly hudAccentColor: string;
  readonly gateAccentColor: number;
  readonly forgeAccentColor: number;
  readonly overlayAccentColor: number;
}

export interface FloorDifficultyProfile {
  readonly id: FloorDifficultyId;
  readonly enemyMaximumHealthBonus: number;
  readonly enemyMovementSpeedMultiplier: number;
  readonly enemyActionCooldownMultiplier: number;
  readonly ashWispProjectileSpeedMultiplier: number;
  readonly stoneWardenChargeSpeedMultiplier: number;
}

export interface EffectiveEnemyStats {
  readonly archetype: EnemyArchetype;
  readonly maximumHealth: number;
  readonly movementSpeed: number;
  readonly postContactRecoveryMs: number;
  readonly wispInitialShotDelayMs: number;
  readonly wispShotCooldownMs: number;
  readonly wispTelegraphMs: number;
  readonly wispProjectileSpeed: number;
  readonly wardenWindUpMs: number;
  readonly wardenRecoveryMs: number;
  readonly wardenChargeSpeed: number;
  readonly enemyDamage: number;
}

export interface FloorPlanBundle {
  readonly floorNumber: FloorNumber;
  readonly floorSeed: string;
  readonly theme: FloorTheme;
  readonly difficulty: FloorDifficultyProfile;
  readonly layout: DungeonLayout;
  readonly objective: EscapeObjectivePlan;
  readonly encounter: EncounterPlan;
  readonly loot: LootPlan;
}

export interface RunPlan {
  readonly runSeed: string;
  readonly fingerprint: string;
  readonly floors: readonly FloorPlanBundle[];
}

export interface RunPlanValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface RunCarryState {
  readonly currentHealth: number;
  readonly availableShards: number;
  readonly totalCollectedShards: number;
  readonly selectedUpgradeIds: readonly UpgradeId[];
}

export interface RunStatistics {
  readonly enemiesDefeated: number;
  readonly roomsDiscovered: number;
  readonly chestsOpened: number;
  readonly shardsCollected: number;
  readonly flasksConsumed: number;
  readonly upgradesSelected: number;
  readonly damageAccepted: number;
  readonly completedFloorCount: number;
}

export interface CurrentFloorStatistics {
  readonly enemiesDefeated: number;
  readonly roomsDiscovered: number;
  readonly chestsOpened: number;
  readonly shardsCollected: number;
  readonly flasksConsumed: number;
  readonly upgradesSelected: number;
  readonly damageAccepted: number;
}

export interface FloorSummary {
  readonly floorNumber: FloorNumber;
  readonly floorSeed: string;
  readonly floorName: string;
  readonly layoutFingerprint: string;
  readonly objectiveFingerprint: string;
  readonly encounterFingerprint: string;
  readonly lootFingerprint: string;
  readonly elapsedTimeMs: number;
  readonly healthRemaining: number;
  readonly roomsDiscovered: number;
  readonly totalRooms: number;
  readonly enemiesDefeated: number;
  readonly totalEnemies: number;
  readonly chestsOpened: number;
  readonly totalChests: number;
  readonly shardsCollected: number;
  readonly flasksConsumed: number;
  readonly damageAccepted: number;
  readonly upgradesSelected: readonly UpgradeId[];
  readonly availableShards: number;
  readonly globalSelectedUpgradeIds: readonly UpgradeId[];
}

export interface FloorEntryCheckpoint {
  readonly floorNumber: FloorNumber;
  readonly carry: RunCarryState;
  readonly runElapsedMs: number;
  readonly cumulativeStats: RunStatistics;
  readonly completedFloors: readonly FloorSummary[];
}

export interface RunSession {
  readonly runSeed: string;
  readonly runFingerprint: string;
  readonly currentFloorNumber: FloorNumber;
  readonly outcome: RunOutcome;
  readonly activity: ActiveRunActivity;
  readonly carry: RunCarryState;
  readonly cumulativeStats: RunStatistics;
  readonly completedFloors: readonly FloorSummary[];
  readonly floorEntryCheckpoint: FloorEntryCheckpoint;
}
