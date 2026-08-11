import { isWalkableTile } from "../dungeon/navigation";
import { SeededRandom } from "../dungeon/random";
import { hashSeed } from "../dungeon/seed";
import type { DungeonLayout, DungeonRoom, WorldPoint } from "../dungeon/types";
import { ENCOUNTER_CONFIG } from "./config";

interface SpawnCandidate {
  readonly tileX: number;
  readonly tileY: number;
  readonly edgeDistance: number;
  readonly rank: number;
}

function squaredDistance(left: Pick<WorldPoint, "x" | "y">, right: Pick<WorldPoint, "x" | "y">) {
  const deltaX = left.x - right.x;
  const deltaY = left.y - right.y;
  return deltaX * deltaX + deltaY * deltaY;
}

export function pointHasEncounterClearance(
  layout: DungeonLayout,
  tileX: number,
  tileY: number,
): boolean {
  const radius = ENCOUNTER_CONFIG.clearanceRadiusTiles;
  for (let y = tileY - radius; y <= tileY + radius; y += 1) {
    for (let x = tileX - radius; x <= tileX + radius; x += 1) {
      if (!isWalkableTile(layout, x, y)) return false;
    }
  }
  return true;
}

export function selectEnemySpawn(
  layout: DungeonLayout,
  room: DungeonRoom,
  blockedPoints: readonly Pick<WorldPoint, "x" | "y">[],
): WorldPoint {
  const random = new SeededRandom(hashSeed(`${layout.seed}:encounter-room:${room.id}`));
  const candidates: SpawnCandidate[] = [];
  for (let tileY = room.y; tileY < room.y + room.height; tileY += 1) {
    for (let tileX = room.x; tileX < room.x + room.width; tileX += 1) {
      const edgeDistance = Math.min(
        tileX - room.x,
        room.x + room.width - 1 - tileX,
        tileY - room.y,
        room.y + room.height - 1 - tileY,
      );
      candidates.push({ tileX, tileY, edgeDistance, rank: random.next() });
    }
  }
  candidates.sort(
    (left, right) =>
      left.edgeDistance - right.edgeDistance ||
      left.rank - right.rank ||
      left.tileY - right.tileY ||
      left.tileX - right.tileX,
  );

  const minimumSquared = ENCOUNTER_CONFIG.minimumObjectSeparation ** 2;
  const selected = candidates.find((candidate) => {
    if (!pointHasEncounterClearance(layout, candidate.tileX, candidate.tileY)) return false;
    const point = {
      x: (candidate.tileX + 0.5) * layout.tileSize,
      y: (candidate.tileY + 0.5) * layout.tileSize,
    };
    return blockedPoints.every((blocked) => squaredDistance(point, blocked) >= minimumSquared);
  });
  if (!selected) {
    throw new RangeError(`Room ${room.id} has no valid deterministic enemy spawn tile.`);
  }
  return Object.freeze({
    x: (selected.tileX + 0.5) * layout.tileSize,
    y: (selected.tileY + 0.5) * layout.tileSize,
    tileX: selected.tileX,
    tileY: selected.tileY,
  });
}
