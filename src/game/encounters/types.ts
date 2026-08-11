import type { WorldPoint } from "../dungeon/types";

export type EnemyArchetype = "bone-stalker" | "ash-wisp" | "stone-warden";

export interface EnemySpawnPlan {
  readonly id: string;
  readonly archetype: EnemyArchetype;
  readonly roomId: number;
  readonly position: WorldPoint;
  readonly maxHealth: number;
}

export interface EncounterPlan {
  readonly fingerprint: string;
  readonly enemies: readonly EnemySpawnPlan[];
}

export interface EncounterValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
