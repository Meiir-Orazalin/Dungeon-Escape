import { findRoomAtTile, isWalkableTile } from "../dungeon/navigation";
import type { DungeonLayout, DungeonRoom, WorldPoint } from "../dungeon/types";
import { LOOT_CONFIG } from "./config";

export function squaredPointDistance(
  left: Readonly<{ x: number; y: number }>,
  right: Readonly<{ x: number; y: number }>,
): number {
  const deltaX = left.x - right.x;
  const deltaY = left.y - right.y;
  return deltaX * deltaX + deltaY * deltaY;
}

export function pointHasLootClearance(
  layout: DungeonLayout,
  tileX: number,
  tileY: number,
): boolean {
  for (
    let y = tileY - LOOT_CONFIG.clearanceRadiusTiles;
    y <= tileY + LOOT_CONFIG.clearanceRadiusTiles;
    y += 1
  ) {
    for (
      let x = tileX - LOOT_CONFIG.clearanceRadiusTiles;
      x <= tileX + LOOT_CONFIG.clearanceRadiusTiles;
      x += 1
    ) {
      if (!isWalkableTile(layout, x, y)) return false;
    }
  }
  return true;
}

export function worldPoint(layout: DungeonLayout, tileX: number, tileY: number): WorldPoint {
  return Object.freeze({
    x: (tileX + 0.5) * layout.tileSize,
    y: (tileY + 0.5) * layout.tileSize,
    tileX,
    tileY,
  });
}

interface TileCandidate {
  readonly tileX: number;
  readonly tileY: number;
  readonly point: WorldPoint;
  readonly primaryRank: number;
  readonly secondaryRank: number;
}

function safeRoomCandidates(
  layout: DungeonLayout,
  room: DungeonRoom,
  rank: (point: WorldPoint) => readonly [number, number],
): TileCandidate[] {
  const candidates: TileCandidate[] = [];
  for (let tileY = room.y; tileY < room.y + room.height; tileY += 1) {
    for (let tileX = room.x; tileX < room.x + room.width; tileX += 1) {
      if (!pointHasLootClearance(layout, tileX, tileY)) continue;
      const point = worldPoint(layout, tileX, tileY);
      const [primaryRank, secondaryRank] = rank(point);
      candidates.push({ tileX, tileY, point, primaryRank, secondaryRank });
    }
  }
  return candidates.sort(
    (left, right) =>
      right.primaryRank - left.primaryRank ||
      right.secondaryRank - left.secondaryRank ||
      left.tileY - right.tileY ||
      left.tileX - right.tileX,
  );
}

export function selectChestPosition(
  layout: DungeonLayout,
  room: DungeonRoom,
  enemyPosition: Readonly<{ x: number; y: number }>,
  blockedPoints: readonly Readonly<{ x: number; y: number }>[],
): WorldPoint {
  const minimumEnemySquared = LOOT_CONFIG.chestEnemySeparation ** 2;
  const candidates = safeRoomCandidates(layout, room, (point) => [
    squaredPointDistance(point, enemyPosition),
    -squaredPointDistance(point, {
      x: (room.center.x + 0.5) * layout.tileSize,
      y: (room.center.y + 0.5) * layout.tileSize,
    }),
  ]);
  const selected = candidates.find(
    ({ point }) =>
      squaredPointDistance(point, enemyPosition) >= minimumEnemySquared &&
      blockedPoints.every((blocked) => squaredPointDistance(point, blocked) > 0),
  )?.point;
  if (!selected) {
    throw new RangeError(
      `Chest room ${room.id} has no safe floor tile at least ${LOOT_CONFIG.chestEnemySeparation} pixels from its enemy.`,
    );
  }
  return selected;
}

export function selectForgePosition(layout: DungeonLayout, room: DungeonRoom): WorldPoint {
  const preferredSquared = LOOT_CONFIG.forgePreferredSpawnSeparation ** 2;
  const candidates = safeRoomCandidates(layout, room, (point) => [
    squaredPointDistance(point, layout.spawn),
    -squaredPointDistance(point, {
      x: (room.center.x + 0.5) * layout.tileSize,
      y: (room.center.y + 0.5) * layout.tileSize,
    }),
  ]);
  const selected =
    candidates.find(({ point }) => squaredPointDistance(point, layout.spawn) >= preferredSquared)
      ?.point ??
    candidates.find(({ point }) => squaredPointDistance(point, layout.spawn) > 0)?.point;
  if (!selected) throw new RangeError(`Spawn room ${room.id} has no safe Runeforge tile.`);
  return selected;
}

export function pointBelongsToRoom(
  layout: DungeonLayout,
  roomId: number,
  point: WorldPoint,
): boolean {
  return findRoomAtTile(layout.rooms, point.tileX, point.tileY)?.id === roomId;
}
