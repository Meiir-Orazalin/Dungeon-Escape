import { SeededRandom } from "../dungeon/random";
import { hashSeed } from "../dungeon/seed";
import type { DungeonLayout } from "../dungeon/types";
import type { EncounterPlan, EnemyArchetype } from "../encounters/types";
import type { EscapeObjectivePlan } from "../objective/types";
import { selectChestRoomIds } from "./chestSelection";
import { ENEMY_FLASK_PROBABILITY, LOOT_CONFIG } from "./config";
import { createLootFingerprint } from "./fingerprint";
import { selectChestPosition, selectForgePosition } from "./placement";
import type { ChestPlan, EnemyRewardPlan, LootPlan } from "./types";
import { validateLootPlan } from "./validateLootPlan";

function enemyShardAmount(archetype: EnemyArchetype): number {
  return archetype === "stone-warden" ? 2 : 1;
}

export class LootPlanningError extends Error {
  public constructor(layoutFingerprint: string, errors: readonly string[]) {
    super(`Unable to create loot for layout ${layoutFingerprint}: ${errors.join("; ")}`);
    this.name = "LootPlanningError";
  }
}

export function createLootPlan(
  layout: DungeonLayout,
  objective: EscapeObjectivePlan,
  encounter: EncounterPlan,
): LootPlan {
  const spawnRoom = layout.rooms.find((room) => room.id === layout.spawnRoomId);
  if (!spawnRoom) throw new LootPlanningError(layout.fingerprint, ["Spawn room is missing."]);
  const forge = Object.freeze({
    roomId: spawnRoom.id,
    position: selectForgePosition(layout, spawnRoom),
  });
  const selectedRoomIds = selectChestRoomIds(
    layout,
    new Set([layout.spawnRoomId, objective.keyRoomId, objective.gateRoomId]),
    LOOT_CONFIG.chestCount,
  );
  const chestRandom = new SeededRandom(
    hashSeed(`${layout.fingerprint}:${objective.fingerprint}:${encounter.fingerprint}:chests`),
  );
  const chests: ChestPlan[] = selectedRoomIds.map((roomId, index) => {
    const room = layout.rooms.find((candidate) => candidate.id === roomId);
    const enemy = encounter.enemies.find((candidate) => candidate.roomId === roomId);
    if (!room || !enemy) {
      throw new LootPlanningError(layout.fingerprint, [
        `Chest room ${roomId} is missing its room or encounter enemy.`,
      ]);
    }
    return Object.freeze({
      id: `chest-${(index + 1).toString().padStart(2, "0")}`,
      roomId,
      position: selectChestPosition(layout, room, enemy.position, [
        layout.spawn,
        objective.keyPosition,
        objective.gatePosition,
      ]),
      shardAmount: chestRandom.integer(
        LOOT_CONFIG.chestMinimumShards,
        LOOT_CONFIG.chestMaximumShards,
      ),
      containsFlask: index === 0 || chestRandom.boolean(0.25),
    });
  });
  const enemyRewards: EnemyRewardPlan[] = [...encounter.enemies]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((enemy) => {
      const random = new SeededRandom(
        hashSeed(`loot-v${LOOT_CONFIG.contractVersion}:${encounter.fingerprint}:${enemy.id}`),
      );
      return Object.freeze({
        enemyId: enemy.id,
        shardAmount: enemyShardAmount(enemy.archetype),
        containsFlask: random.boolean(ENEMY_FLASK_PROBABILITY[enemy.archetype]),
      });
    });
  const totalPlannedShards =
    chests.reduce((total, chest) => total + chest.shardAmount, 0) +
    enemyRewards.reduce((total, reward) => total + reward.shardAmount, 0);
  const guaranteedFlaskCount =
    chests.filter((chest) => chest.containsFlask).length +
    enemyRewards.filter((reward) => reward.containsFlask).length;
  const frozenChests = Object.freeze(chests);
  const frozenRewards = Object.freeze(enemyRewards);
  const fingerprint = createLootFingerprint({
    layoutFingerprint: layout.fingerprint,
    objectiveFingerprint: objective.fingerprint,
    encounterFingerprint: encounter.fingerprint,
    forge,
    chests: frozenChests,
    enemyRewards: frozenRewards,
  });
  const plan: LootPlan = Object.freeze({
    fingerprint,
    forge,
    chests: frozenChests,
    enemyRewards: frozenRewards,
    totalPlannedShards,
    guaranteedFlaskCount,
  });
  const validation = validateLootPlan(layout, objective, encounter, plan);
  if (!validation.valid) throw new LootPlanningError(layout.fingerprint, validation.errors);
  return plan;
}
