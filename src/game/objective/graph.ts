import type { DungeonRoom, RoomConnection } from "../dungeon/types";

export function buildRoomAdjacency(
  rooms: readonly DungeonRoom[],
  connections: readonly RoomConnection[],
): ReadonlyMap<number, readonly number[]> {
  const adjacency = new Map<number, number[]>();
  rooms.forEach((room) => adjacency.set(room.id, []));

  connections.forEach((connection) => {
    adjacency.get(connection.fromRoomId)?.push(connection.toRoomId);
    adjacency.get(connection.toRoomId)?.push(connection.fromRoomId);
  });

  adjacency.forEach((neighbours) => neighbours.sort((left, right) => left - right));
  return adjacency;
}

export function calculateRoomDistances(
  adjacency: ReadonlyMap<number, readonly number[]>,
  startRoomId: number,
): ReadonlyMap<number, number> {
  if (!adjacency.has(startRoomId)) return new Map<number, number>();

  const distances = new Map<number, number>([[startRoomId, 0]]);
  const queue = [startRoomId];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const roomId = queue[cursor] as number;
    const distance = distances.get(roomId) as number;
    (adjacency.get(roomId) ?? []).forEach((neighbour) => {
      if (distances.has(neighbour)) return;
      distances.set(neighbour, distance + 1);
      queue.push(neighbour);
    });
  }

  return distances;
}

interface RankedRoom {
  readonly roomId: number;
  readonly minimumDistance: number;
  readonly totalDistance: number;
  readonly geometricSeparation: number;
}

export function selectKeyRoomId(
  rooms: readonly DungeonRoom[],
  connections: readonly RoomConnection[],
  spawnRoomId: number,
  gateRoomId: number,
  preferredDistance: number,
): number {
  const spawnRoom = rooms.find((room) => room.id === spawnRoomId);
  const gateRoom = rooms.find((room) => room.id === gateRoomId);
  if (!spawnRoom || !gateRoom) {
    throw new RangeError("Key-room selection requires valid spawn and gate rooms.");
  }

  const adjacency = buildRoomAdjacency(rooms, connections);
  const fromSpawn = calculateRoomDistances(adjacency, spawnRoomId);
  const fromGate = calculateRoomDistances(adjacency, gateRoomId);
  const ranked: RankedRoom[] = rooms
    .filter((room) => room.id !== spawnRoomId && room.id !== gateRoomId)
    .flatMap((room) => {
      const spawnDistance = fromSpawn.get(room.id);
      const gateDistance = fromGate.get(room.id);
      if (spawnDistance === undefined || gateDistance === undefined) return [];
      const spawnDeltaX = room.center.x - spawnRoom.center.x;
      const spawnDeltaY = room.center.y - spawnRoom.center.y;
      const gateDeltaX = room.center.x - gateRoom.center.x;
      const gateDeltaY = room.center.y - gateRoom.center.y;
      return [
        {
          roomId: room.id,
          minimumDistance: Math.min(spawnDistance, gateDistance),
          totalDistance: spawnDistance + gateDistance,
          geometricSeparation:
            spawnDeltaX * spawnDeltaX +
            spawnDeltaY * spawnDeltaY +
            gateDeltaX * gateDeltaX +
            gateDeltaY * gateDeltaY,
        },
      ];
    });

  if (ranked.length === 0) {
    throw new RangeError("No reachable room is available for the Runic Key.");
  }

  const preferred = ranked.filter((candidate) => candidate.minimumDistance >= preferredDistance);
  const candidates = preferred.length > 0 ? preferred : ranked;
  candidates.sort(
    (left, right) =>
      right.minimumDistance - left.minimumDistance ||
      right.totalDistance - left.totalDistance ||
      right.geometricSeparation - left.geometricSeparation ||
      left.roomId - right.roomId,
  );

  return (candidates[0] as RankedRoom).roomId;
}
