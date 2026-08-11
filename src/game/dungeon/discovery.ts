import { findRoomAtTile } from "./navigation";
import type { DungeonRoom } from "./types";

export interface RoomDiscoveryState {
  readonly discoveredRoomIds: ReadonlySet<number>;
  readonly currentRoomId: number;
}

export function createRoomDiscovery(spawnRoomId: number): RoomDiscoveryState {
  return {
    discoveredRoomIds: new Set([spawnRoomId]),
    currentRoomId: spawnRoomId,
  };
}

export function updateRoomDiscovery(
  state: RoomDiscoveryState,
  rooms: readonly DungeonRoom[],
  tileX: number,
  tileY: number,
): RoomDiscoveryState {
  const room = findRoomAtTile(rooms, tileX, tileY);

  if (!room || room.id === state.currentRoomId) {
    return state;
  }

  if (state.discoveredRoomIds.has(room.id)) {
    return { ...state, currentRoomId: room.id };
  }

  return {
    discoveredRoomIds: new Set([...state.discoveredRoomIds, room.id]),
    currentRoomId: room.id,
  };
}
