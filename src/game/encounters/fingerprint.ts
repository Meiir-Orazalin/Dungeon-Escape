import { hashSeed } from "../dungeon/seed";
import { ENCOUNTER_CONFIG } from "./config";
import type { EncounterPlan, EnemySpawnPlan } from "./types";

interface EncounterFingerprintInput {
  readonly layoutFingerprint: string;
  readonly objectiveFingerprint: string;
  readonly enemies: readonly EnemySpawnPlan[];
}

function enemyContract(enemy: EnemySpawnPlan): string {
  const point = enemy.position;
  return [
    enemy.id,
    enemy.archetype,
    enemy.roomId,
    point.tileX,
    point.tileY,
    point.x,
    point.y,
    enemy.maxHealth,
  ].join(":");
}

export function createEncounterFingerprint(input: EncounterFingerprintInput): string {
  const orderedEnemies = [...input.enemies].sort(
    (left, right) => left.roomId - right.roomId || left.id.localeCompare(right.id),
  );
  const contract = [
    `v${ENCOUNTER_CONFIG.contractVersion}`,
    input.layoutFingerprint,
    input.objectiveFingerprint,
    ...orderedEnemies.map(enemyContract),
  ].join("|");
  return `ec-${hashSeed(contract).toString(16).padStart(8, "0")}`;
}

export function recomputeEncounterFingerprint(
  layoutFingerprint: string,
  objectiveFingerprint: string,
  plan: EncounterPlan,
): string {
  return createEncounterFingerprint({
    layoutFingerprint,
    objectiveFingerprint,
    enemies: plan.enemies,
  });
}
