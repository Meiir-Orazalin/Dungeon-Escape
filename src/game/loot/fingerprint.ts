import { hashSeed } from "../dungeon/seed";
import { LOOT_CONFIG } from "./config";
import type { ChestPlan, EnemyRewardPlan, LootPlan } from "./types";

interface LootFingerprintInput {
  readonly layoutFingerprint: string;
  readonly objectiveFingerprint: string;
  readonly encounterFingerprint: string;
  readonly forge: LootPlan["forge"];
  readonly chests: readonly ChestPlan[];
  readonly enemyRewards: readonly EnemyRewardPlan[];
}

export function createLootFingerprint(input: LootFingerprintInput): string {
  const chests = [...input.chests].sort((left, right) => left.id.localeCompare(right.id));
  const rewards = [...input.enemyRewards].sort((left, right) =>
    left.enemyId.localeCompare(right.enemyId),
  );
  const contract = [
    `v${LOOT_CONFIG.contractVersion}`,
    `cost-v${LOOT_CONFIG.upgradeCostContractVersion}`,
    input.layoutFingerprint,
    input.objectiveFingerprint,
    input.encounterFingerprint,
    `forge:${input.forge.roomId}:${input.forge.position.tileX}:${input.forge.position.tileY}:${input.forge.position.x}:${input.forge.position.y}`,
    ...chests.map(
      (chest) =>
        `chest:${chest.id}:${chest.roomId}:${chest.position.tileX}:${chest.position.tileY}:${chest.position.x}:${chest.position.y}:${chest.shardAmount}:${Number(chest.containsFlask)}`,
    ),
    ...rewards.map(
      (reward) => `enemy:${reward.enemyId}:${reward.shardAmount}:${Number(reward.containsFlask)}`,
    ),
  ].join("|");
  return `lt-${hashSeed(contract).toString(16).padStart(8, "0")}`;
}

export function recomputeLootFingerprint(
  layoutFingerprint: string,
  objectiveFingerprint: string,
  encounterFingerprint: string,
  plan: LootPlan,
): string {
  return createLootFingerprint({
    layoutFingerprint,
    objectiveFingerprint,
    encounterFingerprint,
    forge: plan.forge,
    chests: plan.chests,
    enemyRewards: plan.enemyRewards,
  });
}
