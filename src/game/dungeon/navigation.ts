import type { DungeonLayout, DungeonRoom, TilePoint } from "./types";

export function tileIndex(x: number, y: number, mapWidth: number): number {
  return y * mapWidth + x;
}

export function isTileInBounds(x: number, y: number, mapWidth: number, mapHeight: number): boolean {
  return x >= 0 && y >= 0 && x < mapWidth && y < mapHeight;
}

export function isWalkableTile(layout: DungeonLayout, x: number, y: number): boolean {
  if (!isTileInBounds(x, y, layout.mapWidth, layout.mapHeight)) return false;
  return layout.floorMask[tileIndex(x, y, layout.mapWidth)] === true;
}

export function isWalkableWorldPoint(layout: DungeonLayout, x: number, y: number): boolean {
  return isWalkableTile(layout, Math.floor(x / layout.tileSize), Math.floor(y / layout.tileSize));
}

export function findRoomAtTile(
  rooms: readonly DungeonRoom[],
  tileX: number,
  tileY: number,
): DungeonRoom | null {
  return (
    rooms.find(
      (room) =>
        tileX >= room.x &&
        tileX < room.x + room.width &&
        tileY >= room.y &&
        tileY < room.y + room.height,
    ) ?? null
  );
}

export function collectReachableFloorTiles(
  floorMask: readonly boolean[],
  mapWidth: number,
  mapHeight: number,
  start: TilePoint,
): ReadonlySet<number> {
  if (
    !isTileInBounds(start.x, start.y, mapWidth, mapHeight) ||
    floorMask[tileIndex(start.x, start.y, mapWidth)] !== true
  ) {
    return new Set<number>();
  }

  const startIndex = tileIndex(start.x, start.y, mapWidth);
  const visited = new Set<number>([startIndex]);
  const queue: number[] = [startIndex];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor] as number;
    const x = current % mapWidth;
    const y = Math.floor(current / mapWidth);
    const neighbours = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as const;

    neighbours.forEach(([nextX, nextY]) => {
      if (!isTileInBounds(nextX, nextY, mapWidth, mapHeight)) return;
      const nextIndex = tileIndex(nextX, nextY, mapWidth);
      if (floorMask[nextIndex] !== true || visited.has(nextIndex)) return;
      visited.add(nextIndex);
      queue.push(nextIndex);
    });
  }

  return visited;
}
