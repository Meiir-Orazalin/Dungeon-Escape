import type { CollisionRectangle } from "./types";

interface TileRun {
  readonly startX: number;
  readonly width: number;
}

interface ActiveRectangle extends TileRun {
  readonly startY: number;
  height: number;
  lastY: number;
}

export function buildCollisionRectangles(
  wallMask: readonly boolean[],
  mapWidth: number,
  mapHeight: number,
  tileSize: number,
): readonly CollisionRectangle[] {
  const completed: ActiveRectangle[] = [];
  let active = new Map<string, ActiveRectangle>();

  for (let y = 0; y < mapHeight; y += 1) {
    const runs: TileRun[] = [];
    let x = 0;

    while (x < mapWidth) {
      if (wallMask[y * mapWidth + x] !== true) {
        x += 1;
        continue;
      }

      const startX = x;
      while (x < mapWidth && wallMask[y * mapWidth + x] === true) x += 1;
      runs.push({ startX, width: x - startX });
    }

    const nextActive = new Map<string, ActiveRectangle>();
    runs.forEach((run) => {
      const key = `${run.startX}:${run.width}`;
      const existing = active.get(key);

      if (existing && existing.lastY === y - 1) {
        existing.height += 1;
        existing.lastY = y;
        nextActive.set(key, existing);
      } else {
        nextActive.set(key, { ...run, startY: y, height: 1, lastY: y });
      }
    });

    active.forEach((rectangle, key) => {
      if (!nextActive.has(key)) completed.push(rectangle);
    });
    active = nextActive;
  }

  completed.push(...active.values());

  return completed
    .sort((left, right) => left.startY - right.startY || left.startX - right.startX)
    .map((rectangle) =>
      Object.freeze({
        x: (rectangle.startX + rectangle.width / 2) * tileSize,
        y: (rectangle.startY + rectangle.height / 2) * tileSize,
        width: rectangle.width * tileSize,
        height: rectangle.height * tileSize,
        startTileX: rectangle.startX,
        startTileY: rectangle.startY,
        widthInTiles: rectangle.width,
        heightInTiles: rectangle.height,
      }),
    );
}
