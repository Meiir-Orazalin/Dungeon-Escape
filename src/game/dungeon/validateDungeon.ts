import { DUNGEON_CONFIG } from "./config";
import {
  collectReachableFloorTiles,
  isTileInBounds,
  isWalkableTile,
  tileIndex,
} from "./navigation";
import type { DungeonLayout, DungeonRoom, ValidationResult } from "./types";

function roomsRespectPadding(first: DungeonRoom, second: DungeonRoom, padding: number): boolean {
  return (
    first.x + first.width + padding <= second.x ||
    second.x + second.width + padding <= first.x ||
    first.y + first.height + padding <= second.y ||
    second.y + second.height + padding <= first.y
  );
}

function pointHasClearance(
  layout: DungeonLayout,
  tileX: number,
  tileY: number,
  radius: number,
): boolean {
  for (let y = tileY - radius; y <= tileY + radius; y += 1) {
    for (let x = tileX - radius; x <= tileX + radius; x += 1) {
      if (!isWalkableTile(layout, x, y)) return false;
    }
  }

  return true;
}

function expectedWallAt(layout: DungeonLayout, x: number, y: number): boolean {
  if (layout.floorMask[tileIndex(x, y, layout.mapWidth)] === true) return false;

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) continue;
      const neighbourX = x + offsetX;
      const neighbourY = y + offsetY;
      if (
        isTileInBounds(neighbourX, neighbourY, layout.mapWidth, layout.mapHeight) &&
        layout.floorMask[tileIndex(neighbourX, neighbourY, layout.mapWidth)] === true
      ) {
        return true;
      }
    }
  }

  return false;
}

function graphIsConnected(layout: DungeonLayout): boolean {
  const firstRoom = layout.rooms[0];
  if (!firstRoom) return false;

  const adjacency = new Map<number, number[]>();
  layout.rooms.forEach((room) => adjacency.set(room.id, []));
  layout.connections.forEach((connection) => {
    adjacency.get(connection.fromRoomId)?.push(connection.toRoomId);
    adjacency.get(connection.toRoomId)?.push(connection.fromRoomId);
  });

  const visited = new Set<number>([firstRoom.id]);
  const queue = [firstRoom.id];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const roomId = queue[cursor] as number;
    (adjacency.get(roomId) ?? []).forEach((neighbour) => {
      if (visited.has(neighbour)) return;
      visited.add(neighbour);
      queue.push(neighbour);
    });
  }

  return visited.size === layout.rooms.length;
}

function collisionGeometryIsAligned(layout: DungeonLayout): boolean {
  const coveredTiles = new Set<number>();

  layout.collisionRectangles.forEach((rectangle) => {
    for (let y = rectangle.startTileY; y < rectangle.startTileY + rectangle.heightInTiles; y += 1) {
      for (
        let x = rectangle.startTileX;
        x < rectangle.startTileX + rectangle.widthInTiles;
        x += 1
      ) {
        coveredTiles.add(tileIndex(x, y, layout.mapWidth));
      }
    }
  });

  return layout.wallMask.every(
    (isWall, index) => coveredTiles.has(index) === isWall && !(isWall && layout.floorMask[index]),
  );
}

export function validateDungeon(layout: DungeonLayout): ValidationResult {
  const errors: string[] = [];
  const expectedTileCount = layout.mapWidth * layout.mapHeight;

  if (
    layout.rooms.length < DUNGEON_CONFIG.minRooms ||
    layout.rooms.length > DUNGEON_CONFIG.maxRooms
  ) {
    errors.push(
      `Room count ${layout.rooms.length} is outside ${DUNGEON_CONFIG.minRooms}-${DUNGEON_CONFIG.maxRooms}.`,
    );
  }

  if (
    layout.floorMask.length !== expectedTileCount ||
    layout.wallMask.length !== expectedTileCount
  ) {
    errors.push("Floor and wall masks must match the configured tile dimensions.");
  }

  if (
    layout.worldWidth !== layout.mapWidth * layout.tileSize ||
    layout.worldHeight !== layout.mapHeight * layout.tileSize
  ) {
    errors.push("World pixel dimensions do not match the tile grid.");
  }

  const roomIds = new Set(layout.rooms.map((room) => room.id));
  if (roomIds.size !== layout.rooms.length) errors.push("Room IDs must be unique.");

  layout.rooms.forEach((room) => {
    if (
      room.x < DUNGEON_CONFIG.solidOuterMargin ||
      room.y < DUNGEON_CONFIG.solidOuterMargin ||
      room.x + room.width > layout.mapWidth - DUNGEON_CONFIG.solidOuterMargin ||
      room.y + room.height > layout.mapHeight - DUNGEON_CONFIG.solidOuterMargin
    ) {
      errors.push(`Room ${room.id} is outside the safe map border.`);
    }

    if (!isWalkableTile(layout, room.center.x, room.center.y)) {
      errors.push(`Room ${room.id} centre is not walkable.`);
    }
  });

  for (let firstIndex = 0; firstIndex < layout.rooms.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < layout.rooms.length; secondIndex += 1) {
      const first = layout.rooms[firstIndex] as DungeonRoom;
      const second = layout.rooms[secondIndex] as DungeonRoom;
      if (!roomsRespectPadding(first, second, layout.roomPadding)) {
        errors.push(`Rooms ${first.id} and ${second.id} violate room padding.`);
      }
    }
  }

  layout.connections.forEach((connection) => {
    if (!roomIds.has(connection.fromRoomId) || !roomIds.has(connection.toRoomId)) {
      errors.push("A room connection references an unknown room ID.");
    }
  });

  if (!graphIsConnected(layout)) errors.push("The room graph is disconnected.");

  if (layout.spawnRoomId === layout.destinationRoomId) {
    errors.push("Spawn and future destination must use different rooms.");
  }

  if (!isWalkableTile(layout, layout.spawn.tileX, layout.spawn.tileY)) {
    errors.push("Spawn is not on walkable floor.");
  }

  if (!isWalkableTile(layout, layout.destination.tileX, layout.destination.tileY)) {
    errors.push("Future destination is not on walkable floor.");
  }

  if (
    !pointHasClearance(
      layout,
      layout.spawn.tileX,
      layout.spawn.tileY,
      DUNGEON_CONFIG.clearanceRadiusTiles,
    )
  ) {
    errors.push("Spawn does not have the required wall clearance.");
  }

  if (
    !pointHasClearance(
      layout,
      layout.destination.tileX,
      layout.destination.tileY,
      DUNGEON_CONFIG.clearanceRadiusTiles,
    )
  ) {
    errors.push("Future destination does not have the required wall clearance.");
  }

  const reachable = collectReachableFloorTiles(
    layout.floorMask,
    layout.mapWidth,
    layout.mapHeight,
    { x: layout.spawn.tileX, y: layout.spawn.tileY },
  );
  const floorCount = layout.floorMask.reduce((count, floor) => count + Number(floor), 0);
  if (reachable.size !== floorCount)
    errors.push("Walkable floor contains disconnected components.");

  layout.rooms.forEach((room) => {
    if (!reachable.has(tileIndex(room.center.x, room.center.y, layout.mapWidth))) {
      errors.push(`Room ${room.id} is unreachable from spawn.`);
    }
  });

  if (
    !reachable.has(tileIndex(layout.destination.tileX, layout.destination.tileY, layout.mapWidth))
  ) {
    errors.push("Future destination is unreachable from spawn.");
  }

  let incorrectWallCount = 0;
  for (let y = 0; y < layout.mapHeight; y += 1) {
    for (let x = 0; x < layout.mapWidth; x += 1) {
      if (layout.wallMask[tileIndex(x, y, layout.mapWidth)] !== expectedWallAt(layout, x, y)) {
        incorrectWallCount += 1;
      }
    }
  }
  if (incorrectWallCount > 0) {
    errors.push(`Wall mask has ${incorrectWallCount} incorrect boundary tiles.`);
  }

  if (!collisionGeometryIsAligned(layout)) {
    errors.push("Merged collision rectangles do not exactly cover the wall mask.");
  }

  if (layout.corridorWidth < DUNGEON_CONFIG.corridorWidth) {
    errors.push("Corridor width is too narrow for the configured player.");
  }

  if (
    layout.generationAttempt < 1 ||
    layout.generationAttempt > DUNGEON_CONFIG.maxDungeonAttempts
  ) {
    errors.push("Generation attempt is outside the bounded retry range.");
  }

  const numericValues = [
    layout.tileSize,
    layout.mapWidth,
    layout.mapHeight,
    layout.worldWidth,
    layout.worldHeight,
    layout.spawn.x,
    layout.spawn.y,
    layout.destination.x,
    layout.destination.y,
    ...layout.rooms.flatMap((room) => [room.x, room.y, room.width, room.height]),
  ];
  if (numericValues.some((value) => !Number.isFinite(value))) {
    errors.push("Generated coordinates and dimensions must be finite.");
  }

  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
