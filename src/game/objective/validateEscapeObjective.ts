import { PLAYER_BODY_SIZE } from "../constants";
import { isWalkableTile, findRoomAtTile } from "../dungeon/navigation";
import type { DungeonLayout, WorldPoint } from "../dungeon/types";
import { OBJECTIVE_CONFIG } from "./config";
import { buildRoomAdjacency, calculateRoomDistances } from "./graph";
import type { EscapeObjectivePlan, ObjectiveValidationResult } from "./types";

function pointHasClearance(layout: DungeonLayout, point: WorldPoint): boolean {
  const radius = OBJECTIVE_CONFIG.clearanceRadiusTiles;
  for (let y = point.tileY - radius; y <= point.tileY + radius; y += 1) {
    for (let x = point.tileX - radius; x <= point.tileX + radius; x += 1) {
      if (!isWalkableTile(layout, x, y)) return false;
    }
  }
  return true;
}

function pointIsFinite(point: WorldPoint): boolean {
  return [point.x, point.y, point.tileX, point.tileY].every(Number.isFinite);
}

function pointMatchesTile(layout: DungeonLayout, point: WorldPoint): boolean {
  return (
    point.x === (point.tileX + 0.5) * layout.tileSize &&
    point.y === (point.tileY + 0.5) * layout.tileSize
  );
}

export function validateEscapeObjective(
  layout: DungeonLayout,
  plan: EscapeObjectivePlan,
): ObjectiveValidationResult {
  const errors: string[] = [];
  const keyRoom = layout.rooms.find((room) => room.id === plan.keyRoomId);
  const gateRoom = layout.rooms.find((room) => room.id === plan.gateRoomId);

  if (!keyRoom) errors.push(`Runic Key room ${plan.keyRoomId} does not exist.`);
  if (!gateRoom) errors.push(`Ancient Gate room ${plan.gateRoomId} does not exist.`);
  if (plan.keyRoomId === layout.spawnRoomId) {
    errors.push("Runic Key room must differ from the spawn room.");
  }
  if (plan.keyRoomId === plan.gateRoomId) {
    errors.push("Runic Key room must differ from the Ancient Gate room.");
  }
  if (plan.gateRoomId !== layout.destinationRoomId) {
    errors.push("Ancient Gate room must use the dungeon destination room.");
  }
  if (
    plan.gatePosition.x !== layout.destination.x ||
    plan.gatePosition.y !== layout.destination.y ||
    plan.gatePosition.tileX !== layout.destination.tileX ||
    plan.gatePosition.tileY !== layout.destination.tileY
  ) {
    errors.push("Ancient Gate position must use the dungeon destination point.");
  }

  if (!pointIsFinite(plan.keyPosition)) errors.push("Runic Key position must be finite.");
  if (!pointIsFinite(plan.gatePosition)) errors.push("Ancient Gate position must be finite.");
  if (!pointMatchesTile(layout, plan.keyPosition)) {
    errors.push("Runic Key world position must match its tile coordinates.");
  }
  if (!pointMatchesTile(layout, plan.gatePosition)) {
    errors.push("Ancient Gate world position must match its tile coordinates.");
  }
  if (!isWalkableTile(layout, plan.keyPosition.tileX, plan.keyPosition.tileY)) {
    errors.push("Runic Key must be on walkable floor.");
  }
  if (!isWalkableTile(layout, plan.gatePosition.tileX, plan.gatePosition.tileY)) {
    errors.push("Ancient Gate must be on walkable floor.");
  }
  if (!pointHasClearance(layout, plan.keyPosition)) {
    errors.push("Runic Key does not have the required wall clearance.");
  }
  if (!pointHasClearance(layout, plan.gatePosition)) {
    errors.push("Ancient Gate does not have the required wall clearance.");
  }
  if (
    keyRoom &&
    findRoomAtTile(layout.rooms, plan.keyPosition.tileX, plan.keyPosition.tileY)?.id !== keyRoom.id
  ) {
    errors.push("Runic Key point is outside its selected room.");
  }
  if (
    gateRoom &&
    findRoomAtTile(layout.rooms, plan.gatePosition.tileX, plan.gatePosition.tileY)?.id !==
      gateRoom.id
  ) {
    errors.push("Ancient Gate point is outside its destination room.");
  }

  const adjacency = buildRoomAdjacency(layout.rooms, layout.connections);
  const fromSpawn = calculateRoomDistances(adjacency, layout.spawnRoomId);
  const fromKey = calculateRoomDistances(adjacency, plan.keyRoomId);
  if (!fromSpawn.has(plan.keyRoomId)) errors.push("Runic Key room is unreachable from spawn.");
  if (!fromSpawn.has(plan.gateRoomId)) errors.push("Ancient Gate room is unreachable from spawn.");
  if (!fromKey.has(plan.gateRoomId))
    errors.push("Ancient Gate room is unreachable from the Runic Key room.");

  if (!/^eo-[0-9a-f]{8}$/.test(plan.fingerprint)) {
    errors.push("Objective fingerprint must use the eo-xxxxxxxx contract.");
  }
  if (
    OBJECTIVE_CONFIG.interactionRadius < PLAYER_BODY_SIZE / 2 ||
    OBJECTIVE_CONFIG.interactionRadius > layout.corridorWidth * layout.tileSize
  ) {
    errors.push("Interaction radius is incompatible with player and corridor geometry.");
  }

  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
