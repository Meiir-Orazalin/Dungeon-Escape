import { isWalkableTile } from "../dungeon/navigation";
import type { DungeonLayout, DungeonRoom, WorldPoint } from "../dungeon/types";
import { OBJECTIVE_CONFIG } from "./config";
import { createObjectiveFingerprint } from "./fingerprint";
import { selectKeyRoomId } from "./graph";
import type { EscapeObjectivePlan } from "./types";
import { validateEscapeObjective } from "./validateEscapeObjective";

function hasClearance(layout: DungeonLayout, tileX: number, tileY: number): boolean {
  const radius = OBJECTIVE_CONFIG.clearanceRadiusTiles;
  for (let y = tileY - radius; y <= tileY + radius; y += 1) {
    for (let x = tileX - radius; x <= tileX + radius; x += 1) {
      if (!isWalkableTile(layout, x, y)) return false;
    }
  }
  return true;
}

function worldPoint(layout: DungeonLayout, tileX: number, tileY: number): WorldPoint {
  return Object.freeze({
    x: (tileX + 0.5) * layout.tileSize,
    y: (tileY + 0.5) * layout.tileSize,
    tileX,
    tileY,
  });
}

function selectSafeKeyPoint(layout: DungeonLayout, room: DungeonRoom): WorldPoint {
  const candidates: Array<{ x: number; y: number; distance: number }> = [];
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      const deltaX = x - room.center.x;
      const deltaY = y - room.center.y;
      candidates.push({ x, y, distance: deltaX * deltaX + deltaY * deltaY });
    }
  }

  candidates.sort(
    (left, right) => left.distance - right.distance || left.y - right.y || left.x - right.x,
  );
  const selected = candidates.find(
    (candidate) =>
      isWalkableTile(layout, candidate.x, candidate.y) &&
      hasClearance(layout, candidate.x, candidate.y),
  );
  if (!selected) throw new RangeError(`Runic Key room ${room.id} has no safe placement tile.`);
  return worldPoint(layout, selected.x, selected.y);
}

export class EscapeObjectivePlanningError extends Error {
  public constructor(layoutFingerprint: string, errors: readonly string[]) {
    super(
      `Unable to create an escape objective for layout ${layoutFingerprint}: ${errors.join("; ")}`,
    );
    this.name = "EscapeObjectivePlanningError";
  }
}

export function createEscapeObjective(layout: DungeonLayout): EscapeObjectivePlan {
  const keyRoomId = selectKeyRoomId(
    layout.rooms,
    layout.connections,
    layout.spawnRoomId,
    layout.destinationRoomId,
    OBJECTIVE_CONFIG.preferredGraphDistance,
  );
  const keyRoom = layout.rooms.find((room) => room.id === keyRoomId);
  if (!keyRoom) {
    throw new EscapeObjectivePlanningError(layout.fingerprint, ["Selected key room is missing."]);
  }

  const keyPosition = selectSafeKeyPoint(layout, keyRoom);
  const gatePosition = Object.freeze({ ...layout.destination });
  const plan: EscapeObjectivePlan = Object.freeze({
    fingerprint: createObjectiveFingerprint({
      layoutFingerprint: layout.fingerprint,
      keyRoomId,
      keyPosition,
      gateRoomId: layout.destinationRoomId,
      gatePosition,
    }),
    keyRoomId,
    keyPosition,
    gateRoomId: layout.destinationRoomId,
    gatePosition,
  });
  const validation = validateEscapeObjective(layout, plan);
  if (!validation.valid) {
    throw new EscapeObjectivePlanningError(layout.fingerprint, validation.errors);
  }
  return plan;
}
