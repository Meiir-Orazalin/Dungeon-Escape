import { findRoomAtTile, isWalkableWorldPoint } from "../dungeon/navigation";
import type { DungeonLayout, WorldPoint } from "../dungeon/types";
import { pointHasLootClearance, squaredPointDistance, worldPoint } from "./placement";

function runtimePoint(layout: DungeonLayout, x: number, y: number): WorldPoint {
  return Object.freeze({
    x,
    y,
    tileX: Math.floor(x / layout.tileSize),
    tileY: Math.floor(y / layout.tileSize),
  });
}

function valid(layout: DungeonLayout, roomId: number, point: WorldPoint): boolean {
  return (
    isWalkableWorldPoint(layout, point.x, point.y) &&
    findRoomAtTile(layout.rooms, point.tileX, point.tileY)?.id === roomId &&
    pointHasLootClearance(layout, point.tileX, point.tileY)
  );
}

export function resolveSafeDropPosition(
  layout: DungeonLayout,
  roomId: number,
  deathPosition: Readonly<{ x: number; y: number }>,
): WorldPoint {
  if (![deathPosition.x, deathPosition.y].every(Number.isFinite)) {
    throw new TypeError("Runtime drop position must be finite.");
  }
  const room = layout.rooms.find((candidate) => candidate.id === roomId);
  if (!room) throw new RangeError(`Runtime drop room ${roomId} does not exist.`);
  const exact = runtimePoint(layout, deathPosition.x, deathPosition.y);
  if (valid(layout, roomId, exact)) return exact;

  const candidates: WorldPoint[] = [];
  for (let tileY = room.y; tileY < room.y + room.height; tileY += 1) {
    for (let tileX = room.x; tileX < room.x + room.width; tileX += 1) {
      const point = worldPoint(layout, tileX, tileY);
      if (valid(layout, roomId, point)) candidates.push(point);
    }
  }
  candidates.sort(
    (left, right) =>
      squaredPointDistance(left, deathPosition) - squaredPointDistance(right, deathPosition) ||
      left.tileY - right.tileY ||
      left.tileX - right.tileX,
  );
  const selected = candidates[0];
  if (!selected) {
    throw new RangeError(`Runtime drop room ${roomId} has no safe walkable pickup position.`);
  }
  return selected;
}
