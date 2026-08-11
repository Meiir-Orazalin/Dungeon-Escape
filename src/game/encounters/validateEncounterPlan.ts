import { findRoomAtTile, isWalkableTile } from "../dungeon/navigation";
import type { DungeonLayout, WorldPoint } from "../dungeon/types";
import type { EscapeObjectivePlan } from "../objective/types";
import { ENCOUNTER_CONFIG, ENEMY_ARCHETYPE_CONFIG } from "./config";
import { recomputeEncounterFingerprint } from "./fingerprint";
import { pointHasEncounterClearance } from "./spawnSelection";
import type { EncounterPlan, EncounterValidationResult, EnemyArchetype } from "./types";

function squaredDistance(left: Pick<WorldPoint, "x" | "y">, right: Pick<WorldPoint, "x" | "y">) {
  const deltaX = left.x - right.x;
  const deltaY = left.y - right.y;
  return deltaX * deltaX + deltaY * deltaY;
}

export function validateEncounterPlan(
  layout: DungeonLayout,
  objective: EscapeObjectivePlan,
  plan: EncounterPlan,
): EncounterValidationResult {
  const errors: string[] = [];
  const expectedRooms = layout.rooms
    .filter((room) => room.id !== layout.spawnRoomId)
    .map((room) => room.id)
    .sort((left, right) => left - right);
  const enemyRooms = plan.enemies.map((enemy) => enemy.roomId).sort((left, right) => left - right);
  if (plan.enemies.length !== layout.rooms.length - 1) {
    errors.push("Enemy count must equal room count minus one.");
  }
  if (JSON.stringify(enemyRooms) !== JSON.stringify(expectedRooms)) {
    errors.push("Every non-spawn room must contain exactly one enemy.");
  }
  if (plan.enemies.some((enemy) => enemy.roomId === layout.spawnRoomId)) {
    errors.push("The spawn room must not contain an enemy.");
  }
  if (new Set(plan.enemies.map((enemy) => enemy.id)).size !== plan.enemies.length) {
    errors.push("Enemy IDs must be unique.");
  }

  const minimumSquared = ENCOUNTER_CONFIG.minimumObjectSeparation ** 2;
  plan.enemies.forEach((enemy) => {
    const room = layout.rooms.find((candidate) => candidate.id === enemy.roomId);
    if (!room) errors.push(`Enemy ${enemy.id} references missing room ${enemy.roomId}.`);
    if (
      ![enemy.position.x, enemy.position.y, enemy.position.tileX, enemy.position.tileY].every(
        Number.isFinite,
      )
    ) {
      errors.push(`Enemy ${enemy.id} position must be finite.`);
    }
    if (
      findRoomAtTile(layout.rooms, enemy.position.tileX, enemy.position.tileY)?.id !== enemy.roomId
    ) {
      errors.push(`Enemy ${enemy.id} position must be inside its declared room.`);
    }
    if (!isWalkableTile(layout, enemy.position.tileX, enemy.position.tileY)) {
      errors.push(`Enemy ${enemy.id} must be on walkable floor.`);
    }
    if (!pointHasEncounterClearance(layout, enemy.position.tileX, enemy.position.tileY)) {
      errors.push(`Enemy ${enemy.id} lacks required wall clearance.`);
    }
    const blockedPoints = [layout.spawn, objective.keyPosition, objective.gatePosition];
    if (blockedPoints.some((point) => squaredDistance(enemy.position, point) < minimumSquared)) {
      errors.push(`Enemy ${enemy.id} violates the minimum object separation contract.`);
    }
    if (enemy.maxHealth !== ENEMY_ARCHETYPE_CONFIG[enemy.archetype].maxHealth) {
      errors.push(`Enemy ${enemy.id} maximum health does not match its archetype.`);
    }
  });

  const archetypes = new Set<EnemyArchetype>(plan.enemies.map((enemy) => enemy.archetype));
  (["bone-stalker", "ash-wisp", "stone-warden"] as const).forEach((archetype) => {
    if (!archetypes.has(archetype)) errors.push(`Encounter plan is missing ${archetype}.`);
  });
  if (
    plan.enemies.find((enemy) => enemy.roomId === objective.keyRoomId)?.archetype !== "ash-wisp"
  ) {
    errors.push("The Runic Key room must contain an Ash Wisp.");
  }
  if (
    plan.enemies.find((enemy) => enemy.roomId === objective.gateRoomId)?.archetype !==
    "stone-warden"
  ) {
    errors.push("The Ancient Gate room must contain a Stone Warden.");
  }
  if (!/^ec-[0-9a-f]{8}$/.test(plan.fingerprint)) {
    errors.push("Encounter fingerprint must use the ec-xxxxxxxx contract.");
  } else if (
    plan.fingerprint !==
    recomputeEncounterFingerprint(layout.fingerprint, objective.fingerprint, plan)
  ) {
    errors.push("Encounter fingerprint does not match the ordered encounter structure.");
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
