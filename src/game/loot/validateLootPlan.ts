import { findRoomAtTile, isWalkableTile } from "../dungeon/navigation";
import type { DungeonLayout, WorldPoint } from "../dungeon/types";
import type { EncounterPlan } from "../encounters/types";
import type { EscapeObjectivePlan } from "../objective/types";
import { LOOT_CONFIG } from "./config";
import { recomputeLootFingerprint } from "./fingerprint";
import { pointHasLootClearance, squaredPointDistance } from "./placement";
import type { LootPlan, LootValidationResult } from "./types";

function finitePoint(point: WorldPoint): boolean {
  return [point.x, point.y, point.tileX, point.tileY].every(Number.isFinite);
}

export function validateLootPlan(
  layout: DungeonLayout,
  objective: EscapeObjectivePlan,
  encounter: EncounterPlan,
  plan: LootPlan,
): LootValidationResult {
  const errors: string[] = [];
  const roomIds = new Set(layout.rooms.map((room) => room.id));
  if (!/^lt-[0-9a-f]{8}$/.test(plan.fingerprint)) {
    errors.push("Loot fingerprint must use the lt-xxxxxxxx contract.");
  } else if (
    plan.fingerprint !==
    recomputeLootFingerprint(layout.fingerprint, objective.fingerprint, encounter.fingerprint, plan)
  ) {
    errors.push("Loot fingerprint does not match the ordered loot structure.");
  }
  if (plan.forge.roomId !== layout.spawnRoomId)
    errors.push("Runeforge room must equal spawn room.");
  if (!finitePoint(plan.forge.position)) errors.push("Runeforge position must be finite.");
  if (!isWalkableTile(layout, plan.forge.position.tileX, plan.forge.position.tileY)) {
    errors.push("Runeforge must be on walkable floor.");
  }
  if (
    findRoomAtTile(layout.rooms, plan.forge.position.tileX, plan.forge.position.tileY)?.id !==
    plan.forge.roomId
  ) {
    errors.push("Runeforge position must be inside the spawn room.");
  }
  if (!pointHasLootClearance(layout, plan.forge.position.tileX, plan.forge.position.tileY)) {
    errors.push("Runeforge lacks required wall clearance.");
  }
  if (squaredPointDistance(plan.forge.position, layout.spawn) === 0) {
    errors.push("Runeforge must not overlap the player spawn.");
  }

  if (plan.chests.length !== LOOT_CONFIG.chestCount) {
    errors.push(`Loot plan must contain exactly ${LOOT_CONFIG.chestCount} chests.`);
  }
  if (new Set(plan.chests.map((chest) => chest.id)).size !== plan.chests.length) {
    errors.push("Chest IDs must be unique.");
  }
  if (new Set(plan.chests.map((chest) => chest.roomId)).size !== plan.chests.length) {
    errors.push("Chest rooms must be unique.");
  }
  plan.chests.forEach((chest) => {
    if (!roomIds.has(chest.roomId))
      errors.push(`Chest ${chest.id} references missing room ${chest.roomId}.`);
    if ([layout.spawnRoomId, objective.keyRoomId, objective.gateRoomId].includes(chest.roomId)) {
      errors.push(`Chest ${chest.id} uses an excluded spawn, key, or gate room.`);
    }
    if (!finitePoint(chest.position)) errors.push(`Chest ${chest.id} position must be finite.`);
    if (
      findRoomAtTile(layout.rooms, chest.position.tileX, chest.position.tileY)?.id !== chest.roomId
    ) {
      errors.push(`Chest ${chest.id} position must be inside its declared room.`);
    }
    if (!isWalkableTile(layout, chest.position.tileX, chest.position.tileY)) {
      errors.push(`Chest ${chest.id} must be on walkable floor.`);
    }
    if (!pointHasLootClearance(layout, chest.position.tileX, chest.position.tileY)) {
      errors.push(`Chest ${chest.id} lacks required wall clearance.`);
    }
    const enemy = encounter.enemies.find((candidate) => candidate.roomId === chest.roomId);
    if (!enemy) errors.push(`Chest ${chest.id} room has no planned enemy.`);
    else if (
      squaredPointDistance(chest.position, enemy.position) <
      LOOT_CONFIG.chestEnemySeparation ** 2
    ) {
      errors.push(`Chest ${chest.id} violates enemy separation.`);
    }
    if (
      !Number.isInteger(chest.shardAmount) ||
      chest.shardAmount < LOOT_CONFIG.chestMinimumShards ||
      chest.shardAmount > LOOT_CONFIG.chestMaximumShards
    ) {
      errors.push(`Chest ${chest.id} shard amount is outside the configured range.`);
    }
  });
  for (let first = 0; first < plan.chests.length; first += 1) {
    for (let second = first + 1; second < plan.chests.length; second += 1) {
      if (squaredPointDistance(plan.chests[first]!.position, plan.chests[second]!.position) === 0) {
        errors.push(`Chests ${plan.chests[first]!.id} and ${plan.chests[second]!.id} overlap.`);
      }
    }
  }
  const lowestChest = [...plan.chests].sort((left, right) => left.id.localeCompare(right.id))[0];
  if (!lowestChest?.containsFlask)
    errors.push("The lowest stable chest ID must guarantee a flask.");

  const expectedEnemyIds = [...encounter.enemies].map((enemy) => enemy.id).sort();
  const rewardIds = plan.enemyRewards.map((reward) => reward.enemyId).sort();
  if (new Set(rewardIds).size !== rewardIds.length) errors.push("Enemy reward IDs must be unique.");
  if (JSON.stringify(rewardIds) !== JSON.stringify(expectedEnemyIds)) {
    errors.push(
      "Every encounter enemy must have exactly one reward plan and no unknown reward may exist.",
    );
  }
  plan.enemyRewards.forEach((reward) => {
    const enemy = encounter.enemies.find((candidate) => candidate.id === reward.enemyId);
    const expected = enemy?.archetype === "stone-warden" ? 2 : 1;
    if (!enemy || reward.shardAmount !== expected) {
      errors.push(`Enemy reward ${reward.enemyId} does not match its archetype shard rule.`);
    }
    if (typeof reward.containsFlask !== "boolean") {
      errors.push(`Enemy reward ${reward.enemyId} has an invalid flask assignment.`);
    }
  });
  const calculatedTotal =
    plan.chests.reduce((total, chest) => total + chest.shardAmount, 0) +
    plan.enemyRewards.reduce((total, reward) => total + reward.shardAmount, 0);
  if (plan.totalPlannedShards !== calculatedTotal)
    errors.push("Total planned shards is inconsistent.");
  if (plan.totalPlannedShards < LOOT_CONFIG.minimumPlannedShards) {
    errors.push(`Total planned shards must be at least ${LOOT_CONFIG.minimumPlannedShards}.`);
  }
  const calculatedFlasks =
    plan.chests.filter((chest) => chest.containsFlask).length +
    plan.enemyRewards.filter((reward) => reward.containsFlask).length;
  if (plan.guaranteedFlaskCount !== calculatedFlasks)
    errors.push("Guaranteed flask count is inconsistent.");
  if (plan.guaranteedFlaskCount < 1) errors.push("At least one Vitality Flask must be guaranteed.");
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
