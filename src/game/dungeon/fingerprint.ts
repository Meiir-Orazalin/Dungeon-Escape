import { hashSeed } from "./seed";
import type { DungeonRoom, RoomConnection, TilePoint } from "./types";

export interface FingerprintSource {
  readonly seed: string;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly rooms: readonly DungeonRoom[];
  readonly connections: readonly RoomConnection[];
  readonly floorMask: readonly boolean[];
  readonly spawn: TilePoint;
  readonly spawnRoomId: number;
  readonly destination: TilePoint;
  readonly destinationRoomId: number;
}

function mix(hash: number, value: number): number {
  let mixed = hash ^ (value >>> 0);
  mixed = Math.imul(mixed, 0x01000193);
  return mixed >>> 0;
}

export function createLayoutFingerprint(source: FingerprintSource): string {
  let hash = hashSeed(source.seed);
  hash = mix(hash, source.mapWidth);
  hash = mix(hash, source.mapHeight);

  source.rooms.forEach((room) => {
    hash = mix(hash, room.id);
    hash = mix(hash, room.x);
    hash = mix(hash, room.y);
    hash = mix(hash, room.width);
    hash = mix(hash, room.height);
  });

  source.connections.forEach((connection) => {
    hash = mix(hash, connection.fromRoomId);
    hash = mix(hash, connection.toRoomId);
    hash = mix(hash, connection.orientation === "horizontal-first" ? 1 : 2);
  });

  source.floorMask.forEach((walkable, index) => {
    if (walkable) hash = mix(hash, index + 1);
  });

  hash = mix(hash, source.spawn.x);
  hash = mix(hash, source.spawn.y);
  hash = mix(hash, source.spawnRoomId);
  hash = mix(hash, source.destination.x);
  hash = mix(hash, source.destination.y);
  hash = mix(hash, source.destinationRoomId);

  return `dg-${hash.toString(16).padStart(8, "0")}`;
}
