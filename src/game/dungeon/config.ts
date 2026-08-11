export const DUNGEON_CONFIG = Object.freeze({
  tileSize: 32,
  mapWidth: 72,
  mapHeight: 44,
  minRooms: 10,
  maxRooms: 14,
  minRoomWidth: 7,
  maxRoomWidth: 13,
  minRoomHeight: 6,
  maxRoomHeight: 11,
  roomPadding: 2,
  corridorWidth: 3,
  solidOuterMargin: 2,
  maxDungeonAttempts: 32,
  roomPlacementAttempts: 360,
  minExtraConnections: 1,
  maxExtraConnections: 3,
  clearanceRadiusTiles: 1,
  maxSeedLength: 48,
});

export type DungeonConfig = typeof DUNGEON_CONFIG;
