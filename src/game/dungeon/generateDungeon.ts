import { buildCollisionRectangles } from "./collisionGeometry";
import { DUNGEON_CONFIG } from "./config";
import { createLayoutFingerprint } from "./fingerprint";
import { tileIndex } from "./navigation";
import { SeededRandom } from "./random";
import { deriveAttemptState, normalizeSeed } from "./seed";
import type {
  CorridorOrientation,
  DungeonLayout,
  DungeonRoom,
  RoomConnection,
  TilePoint,
  WorldPoint,
} from "./types";
import { validateDungeon } from "./validateDungeon";

interface WeightedEdge {
  readonly first: number;
  readonly second: number;
  readonly weight: number;
}

class DisjointSet {
  private readonly parent: number[];

  public constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
  }

  public find(value: number): number {
    const parent = this.parent[value];
    if (parent === undefined) throw new RangeError("Disjoint-set value is out of range.");
    if (parent === value) return value;
    const root = this.find(parent);
    this.parent[value] = root;
    return root;
  }

  public connect(first: number, second: number): boolean {
    const firstRoot = this.find(first);
    const secondRoot = this.find(second);
    if (firstRoot === secondRoot) return false;
    this.parent[secondRoot] = firstRoot;
    return true;
  }
}

function roomsRespectPadding(first: DungeonRoom, second: DungeonRoom): boolean {
  const padding = DUNGEON_CONFIG.roomPadding;
  return (
    first.x + first.width + padding <= second.x ||
    second.x + second.width + padding <= first.x ||
    first.y + first.height + padding <= second.y ||
    second.y + second.height + padding <= first.y
  );
}

function placeRooms(random: SeededRandom): DungeonRoom[] {
  const rooms: DungeonRoom[] = [];
  const targetCount = random.integer(DUNGEON_CONFIG.minRooms, DUNGEON_CONFIG.maxRooms);

  for (
    let placementAttempt = 0;
    placementAttempt < DUNGEON_CONFIG.roomPlacementAttempts && rooms.length < targetCount;
    placementAttempt += 1
  ) {
    const width = random.integer(DUNGEON_CONFIG.minRoomWidth, DUNGEON_CONFIG.maxRoomWidth);
    const height = random.integer(DUNGEON_CONFIG.minRoomHeight, DUNGEON_CONFIG.maxRoomHeight);
    const x = random.integer(
      DUNGEON_CONFIG.solidOuterMargin,
      DUNGEON_CONFIG.mapWidth - DUNGEON_CONFIG.solidOuterMargin - width,
    );
    const y = random.integer(
      DUNGEON_CONFIG.solidOuterMargin,
      DUNGEON_CONFIG.mapHeight - DUNGEON_CONFIG.solidOuterMargin - height,
    );
    const candidate: DungeonRoom = {
      id: rooms.length,
      x,
      y,
      width,
      height,
      center: { x: x + Math.floor(width / 2), y: y + Math.floor(height / 2) },
    };

    if (rooms.every((room) => roomsRespectPadding(candidate, room))) rooms.push(candidate);
  }

  return rooms;
}

function buildWeightedEdges(rooms: readonly DungeonRoom[]): WeightedEdge[] {
  const edges: WeightedEdge[] = [];

  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      const firstRoom = rooms[first] as DungeonRoom;
      const secondRoom = rooms[second] as DungeonRoom;
      const deltaX = firstRoom.center.x - secondRoom.center.x;
      const deltaY = firstRoom.center.y - secondRoom.center.y;
      edges.push({ first, second, weight: deltaX * deltaX + deltaY * deltaY });
    }
  }

  return edges.sort(
    (left, right) =>
      left.weight - right.weight || left.first - right.first || left.second - right.second,
  );
}

function selectConnectedEdges(rooms: readonly DungeonRoom[], random: SeededRandom): WeightedEdge[] {
  const allEdges = buildWeightedEdges(rooms);
  const disjointSet = new DisjointSet(rooms.length);
  const spanningEdges: WeightedEdge[] = [];

  allEdges.forEach((edge) => {
    if (spanningEdges.length < rooms.length - 1 && disjointSet.connect(edge.first, edge.second)) {
      spanningEdges.push(edge);
    }
  });

  const spanningKeys = new Set(spanningEdges.map((edge) => `${edge.first}:${edge.second}`));
  const nearbyCandidates = allEdges
    .filter((edge) => !spanningKeys.has(`${edge.first}:${edge.second}`))
    .slice(0, rooms.length * 3);
  const extraCount = Math.min(
    nearbyCandidates.length,
    random.integer(DUNGEON_CONFIG.minExtraConnections, DUNGEON_CONFIG.maxExtraConnections),
  );

  return [...spanningEdges, ...random.shuffle(nearbyCandidates).slice(0, extraCount)];
}

function corridorIntersections(
  rooms: readonly DungeonRoom[],
  firstRoomId: number,
  secondRoomId: number,
  start: TilePoint,
  bend: TilePoint,
  end: TilePoint,
): number {
  let intersections = 0;
  const radius = Math.floor(DUNGEON_CONFIG.corridorWidth / 2);

  const inspect = (x: number, y: number): void => {
    rooms.forEach((room) => {
      if (room.id === firstRoomId || room.id === secondRoomId) return;
      if (
        x + radius >= room.x &&
        x - radius < room.x + room.width &&
        y + radius >= room.y &&
        y - radius < room.y + room.height
      ) {
        intersections += 1;
      }
    });
  };

  if (start.y === bend.y) {
    for (let x = Math.min(start.x, bend.x); x <= Math.max(start.x, bend.x); x += 1) {
      inspect(x, start.y);
    }
    for (let y = Math.min(bend.y, end.y); y <= Math.max(bend.y, end.y); y += 1) {
      inspect(end.x, y);
    }
  } else {
    for (let y = Math.min(start.y, bend.y); y <= Math.max(start.y, bend.y); y += 1) {
      inspect(start.x, y);
    }
    for (let x = Math.min(bend.x, end.x); x <= Math.max(bend.x, end.x); x += 1) {
      inspect(x, end.y);
    }
  }

  return intersections;
}

function createConnection(
  rooms: readonly DungeonRoom[],
  edge: WeightedEdge,
  random: SeededRandom,
): RoomConnection {
  const firstRoom = rooms[edge.first] as DungeonRoom;
  const secondRoom = rooms[edge.second] as DungeonRoom;
  const horizontalBend = { x: secondRoom.center.x, y: firstRoom.center.y };
  const verticalBend = { x: firstRoom.center.x, y: secondRoom.center.y };
  const horizontalScore = corridorIntersections(
    rooms,
    firstRoom.id,
    secondRoom.id,
    firstRoom.center,
    horizontalBend,
    secondRoom.center,
  );
  const verticalScore = corridorIntersections(
    rooms,
    firstRoom.id,
    secondRoom.id,
    firstRoom.center,
    verticalBend,
    secondRoom.center,
  );
  const orientation: CorridorOrientation =
    horizontalScore < verticalScore
      ? "horizontal-first"
      : verticalScore < horizontalScore
        ? "vertical-first"
        : random.boolean()
          ? "horizontal-first"
          : "vertical-first";
  const bend = orientation === "horizontal-first" ? horizontalBend : verticalBend;

  return {
    fromRoomId: firstRoom.id,
    toRoomId: secondRoom.id,
    orientation,
    waypoints: [firstRoom.center, bend, secondRoom.center],
  };
}

function carveTile(floorMask: boolean[], x: number, y: number): void {
  if (x < 0 || y < 0 || x >= DUNGEON_CONFIG.mapWidth || y >= DUNGEON_CONFIG.mapHeight) {
    return;
  }
  floorMask[tileIndex(x, y, DUNGEON_CONFIG.mapWidth)] = true;
}

function carveRoom(floorMask: boolean[], room: DungeonRoom): void {
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) carveTile(floorMask, x, y);
  }
}

function carveConnection(floorMask: boolean[], connection: RoomConnection): void {
  const [start, bend, end] = connection.waypoints as [TilePoint, TilePoint, TilePoint];
  const radius = Math.floor(DUNGEON_CONFIG.corridorWidth / 2);

  const carveHorizontal = (fromX: number, toX: number, y: number): void => {
    for (let x = Math.min(fromX, toX); x <= Math.max(fromX, toX); x += 1) {
      for (let offset = -radius; offset <= radius; offset += 1) carveTile(floorMask, x, y + offset);
    }
  };
  const carveVertical = (fromY: number, toY: number, x: number): void => {
    for (let y = Math.min(fromY, toY); y <= Math.max(fromY, toY); y += 1) {
      for (let offset = -radius; offset <= radius; offset += 1) carveTile(floorMask, x + offset, y);
    }
  };

  if (connection.orientation === "horizontal-first") {
    carveHorizontal(start.x, bend.x, start.y);
    carveVertical(bend.y, end.y, end.x);
  } else {
    carveVertical(start.y, bend.y, start.x);
    carveHorizontal(bend.x, end.x, end.y);
  }
}

function deriveWallMask(floorMask: readonly boolean[]): boolean[] {
  const wallMask = Array<boolean>(floorMask.length).fill(false);

  for (let y = 0; y < DUNGEON_CONFIG.mapHeight; y += 1) {
    for (let x = 0; x < DUNGEON_CONFIG.mapWidth; x += 1) {
      const index = tileIndex(x, y, DUNGEON_CONFIG.mapWidth);
      if (floorMask[index]) continue;

      for (let offsetY = -1; offsetY <= 1 && !wallMask[index]; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const neighbourX = x + offsetX;
          const neighbourY = y + offsetY;
          if (
            neighbourX >= 0 &&
            neighbourY >= 0 &&
            neighbourX < DUNGEON_CONFIG.mapWidth &&
            neighbourY < DUNGEON_CONFIG.mapHeight &&
            floorMask[tileIndex(neighbourX, neighbourY, DUNGEON_CONFIG.mapWidth)]
          ) {
            wallMask[index] = true;
            break;
          }
        }
      }
    }
  }

  return wallMask;
}

function findFarthestRoom(
  startRoomId: number,
  rooms: readonly DungeonRoom[],
  connections: readonly RoomConnection[],
): number {
  const adjacency = new Map<number, number[]>();
  rooms.forEach((room) => adjacency.set(room.id, []));
  connections.forEach((connection) => {
    adjacency.get(connection.fromRoomId)?.push(connection.toRoomId);
    adjacency.get(connection.toRoomId)?.push(connection.fromRoomId);
  });

  const distances = new Map<number, number>([[startRoomId, 0]]);
  const queue = [startRoomId];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const roomId = queue[cursor] as number;
    (adjacency.get(roomId) ?? []).forEach((neighbour) => {
      if (distances.has(neighbour)) return;
      distances.set(neighbour, (distances.get(roomId) ?? 0) + 1);
      queue.push(neighbour);
    });
  }

  return (
    [...distances.entries()].sort(
      ([leftId, leftDistance], [rightId, rightDistance]) =>
        rightDistance - leftDistance || leftId - rightId,
    )[0]?.[0] ?? startRoomId
  );
}

function worldPointFromTile(point: TilePoint): WorldPoint {
  return Object.freeze({
    x: (point.x + 0.5) * DUNGEON_CONFIG.tileSize,
    y: (point.y + 0.5) * DUNGEON_CONFIG.tileSize,
    tileX: point.x,
    tileY: point.y,
  });
}

function freezeLayout(layout: DungeonLayout): DungeonLayout {
  layout.rooms.forEach((room) => {
    Object.freeze(room.center);
    Object.freeze(room);
  });
  layout.connections.forEach((connection) => {
    connection.waypoints.forEach(Object.freeze);
    Object.freeze(connection.waypoints);
    Object.freeze(connection);
  });

  Object.freeze(layout.rooms);
  Object.freeze(layout.connections);
  Object.freeze(layout.floorMask);
  Object.freeze(layout.wallMask);
  Object.freeze(layout.collisionRectangles);
  return Object.freeze(layout);
}

function createAttempt(seed: string, zeroBasedAttempt: number): DungeonLayout | null {
  const random = new SeededRandom(deriveAttemptState(seed, zeroBasedAttempt));
  const rooms = placeRooms(random);
  if (rooms.length < DUNGEON_CONFIG.minRooms) return null;

  const selectedEdges = selectConnectedEdges(rooms, random);
  const connections = selectedEdges.map((edge) => createConnection(rooms, edge, random));
  const floorMask = Array<boolean>(DUNGEON_CONFIG.mapWidth * DUNGEON_CONFIG.mapHeight).fill(false);
  rooms.forEach((room) => carveRoom(floorMask, room));
  connections.forEach((connection) => carveConnection(floorMask, connection));
  const wallMask = deriveWallMask(floorMask);
  const firstEndpoint = findFarthestRoom(rooms[0]?.id ?? 0, rooms, connections);
  const secondEndpoint = findFarthestRoom(firstEndpoint, rooms, connections);
  const spawnRoom = rooms.find((room) => room.id === firstEndpoint) as DungeonRoom;
  const destinationRoom = rooms.find((room) => room.id === secondEndpoint) as DungeonRoom;
  const spawn = worldPointFromTile(spawnRoom.center);
  const destination = worldPointFromTile(destinationRoom.center);
  const fingerprint = createLayoutFingerprint({
    seed,
    mapWidth: DUNGEON_CONFIG.mapWidth,
    mapHeight: DUNGEON_CONFIG.mapHeight,
    rooms,
    connections,
    floorMask,
    spawn: spawnRoom.center,
    spawnRoomId: spawnRoom.id,
    destination: destinationRoom.center,
    destinationRoomId: destinationRoom.id,
  });

  return freezeLayout({
    seed,
    fingerprint,
    tileSize: DUNGEON_CONFIG.tileSize,
    mapWidth: DUNGEON_CONFIG.mapWidth,
    mapHeight: DUNGEON_CONFIG.mapHeight,
    worldWidth: DUNGEON_CONFIG.mapWidth * DUNGEON_CONFIG.tileSize,
    worldHeight: DUNGEON_CONFIG.mapHeight * DUNGEON_CONFIG.tileSize,
    corridorWidth: DUNGEON_CONFIG.corridorWidth,
    roomPadding: DUNGEON_CONFIG.roomPadding,
    rooms,
    connections,
    floorMask,
    wallMask,
    collisionRectangles: buildCollisionRectangles(
      wallMask,
      DUNGEON_CONFIG.mapWidth,
      DUNGEON_CONFIG.mapHeight,
      DUNGEON_CONFIG.tileSize,
    ),
    spawn,
    spawnRoomId: spawnRoom.id,
    destination,
    destinationRoomId: destinationRoom.id,
    generationAttempt: zeroBasedAttempt + 1,
  });
}

export class DungeonGenerationError extends Error {
  public constructor(seed: string, errors: readonly string[]) {
    super(
      `Unable to generate a valid dungeon for seed "${seed}" within ${DUNGEON_CONFIG.maxDungeonAttempts} attempts. Last validation errors: ${errors.join("; ") || "room placement failed"}`,
    );
    this.name = "DungeonGenerationError";
  }
}

export function generateDungeon(requestedSeed: string): DungeonLayout {
  const seed = normalizeSeed(requestedSeed);
  let lastErrors: readonly string[] = [];

  for (let attempt = 0; attempt < DUNGEON_CONFIG.maxDungeonAttempts; attempt += 1) {
    const layout = createAttempt(seed, attempt);
    if (!layout) {
      lastErrors = ["Room placement did not reach the minimum room count."];
      continue;
    }

    const validation = validateDungeon(layout);
    if (validation.valid) return layout;
    lastErrors = validation.errors;
  }

  throw new DungeonGenerationError(seed, lastErrors);
}
