export interface TilePoint {
  readonly x: number;
  readonly y: number;
}

export interface WorldPoint extends TilePoint {
  readonly tileX: number;
  readonly tileY: number;
}

export interface DungeonRoom {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly center: TilePoint;
}

export type CorridorOrientation = "horizontal-first" | "vertical-first";

export interface RoomConnection {
  readonly fromRoomId: number;
  readonly toRoomId: number;
  readonly orientation: CorridorOrientation;
  readonly waypoints: readonly TilePoint[];
}

export interface CollisionRectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly startTileX: number;
  readonly startTileY: number;
  readonly widthInTiles: number;
  readonly heightInTiles: number;
}

export interface DungeonLayout {
  readonly seed: string;
  readonly fingerprint: string;
  readonly tileSize: number;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly corridorWidth: number;
  readonly roomPadding: number;
  readonly rooms: readonly DungeonRoom[];
  readonly connections: readonly RoomConnection[];
  readonly floorMask: readonly boolean[];
  readonly wallMask: readonly boolean[];
  readonly collisionRectangles: readonly CollisionRectangle[];
  readonly spawn: WorldPoint;
  readonly spawnRoomId: number;
  readonly destination: WorldPoint;
  readonly destinationRoomId: number;
  readonly generationAttempt: number;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
