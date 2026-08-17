import type { DungeonLayout, DungeonRoom } from "../dungeon/types";
import { buildRoomAdjacency, calculateRoomDistances } from "../objective/graph";

interface RankedChestRoom {
  readonly room: DungeonRoom;
  readonly minimumSelectedDistance: number;
  readonly spawnDistance: number;
  readonly geometricSeparation: number;
}

function squaredRoomDistance(left: DungeonRoom, right: DungeonRoom): number {
  const deltaX = left.center.x - right.center.x;
  const deltaY = left.center.y - right.center.y;
  return deltaX * deltaX + deltaY * deltaY;
}

export function selectChestRoomIds(
  layout: DungeonLayout,
  excludedRoomIds: ReadonlySet<number>,
  count: number,
): readonly number[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError("Chest-room selection requires a positive integer count.");
  }
  const candidates = [...layout.rooms]
    .filter((room) => !excludedRoomIds.has(room.id))
    .sort((left, right) => left.id - right.id);
  if (candidates.length < count) {
    throw new RangeError(
      `Chest-room selection requires ${count} eligible rooms, but only ${candidates.length} exist.`,
    );
  }

  const adjacency = buildRoomAdjacency(layout.rooms, layout.connections);
  const fromSpawn = calculateRoomDistances(adjacency, layout.spawnRoomId);
  const selected: DungeonRoom[] = [];

  while (selected.length < count) {
    const ranked: RankedChestRoom[] = candidates
      .filter((room) => !selected.some((chosen) => chosen.id === room.id))
      .map((room) => {
        const spawnDistance = fromSpawn.get(room.id);
        if (spawnDistance === undefined) {
          throw new RangeError(`Chest candidate room ${room.id} is unreachable from spawn.`);
        }
        const selectedDistances = selected.map((chosen) => {
          const distance = calculateRoomDistances(adjacency, chosen.id).get(room.id);
          if (distance === undefined) {
            throw new RangeError(
              `Chest candidate room ${room.id} is unreachable from room ${chosen.id}.`,
            );
          }
          return distance;
        });
        return {
          room,
          minimumSelectedDistance:
            selectedDistances.length === 0
              ? Number.POSITIVE_INFINITY
              : Math.min(...selectedDistances),
          spawnDistance,
          geometricSeparation:
            selected.length === 0
              ? 0
              : Math.min(...selected.map((chosen) => squaredRoomDistance(room, chosen))),
        };
      });
    ranked.sort(
      (left, right) =>
        right.minimumSelectedDistance - left.minimumSelectedDistance ||
        right.spawnDistance - left.spawnDistance ||
        right.geometricSeparation - left.geometricSeparation ||
        left.room.id - right.room.id,
    );
    const next = ranked[0]?.room;
    if (!next) throw new RangeError("Chest-room maximin selection produced no candidate.");
    selected.push(next);
  }

  return Object.freeze(selected.map((room) => room.id));
}
