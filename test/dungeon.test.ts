import { describe, expect, it } from "vitest";

import { DUNGEON_CONFIG } from "../src/game/dungeon/config";
import { generateDungeon } from "../src/game/dungeon/generateDungeon";
import {
  collectReachableFloorTiles,
  isWalkableTile,
  tileIndex,
} from "../src/game/dungeon/navigation";
import { SeededRandom } from "../src/game/dungeon/random";
import {
  deriveAttemptState,
  hashSeed,
  normalizeSeed,
  seedFromSearch,
} from "../src/game/dungeon/seed";
import type { DungeonLayout, DungeonRoom } from "../src/game/dungeon/types";
import { validateDungeon } from "../src/game/dungeon/validateDungeon";

function roomsRespectPadding(first: DungeonRoom, second: DungeonRoom): boolean {
  const padding = DUNGEON_CONFIG.roomPadding;
  return (
    first.x + first.width + padding <= second.x ||
    second.x + second.width + padding <= first.x ||
    first.y + first.height + padding <= second.y ||
    second.y + second.height + padding <= first.y
  );
}

function graphReachableRoomIds(layout: DungeonLayout): ReadonlySet<number> {
  const adjacency = new Map<number, number[]>();
  layout.rooms.forEach((room) => adjacency.set(room.id, []));
  layout.connections.forEach((connection) => {
    adjacency.get(connection.fromRoomId)?.push(connection.toRoomId);
    adjacency.get(connection.toRoomId)?.push(connection.fromRoomId);
  });

  const visited = new Set<number>([layout.spawnRoomId]);
  const queue = [layout.spawnRoomId];
  for (let index = 0; index < queue.length; index += 1) {
    (adjacency.get(queue[index] as number) ?? []).forEach((roomId) => {
      if (visited.has(roomId)) return;
      visited.add(roomId);
      queue.push(roomId);
    });
  }
  return visited;
}

describe("seed contract", () => {
  it("normalizes equivalent seed text stably", () => {
    expect(normalizeSeed("  Émber   Vault__7  ")).toBe("ember-vault__7");
    expect(normalizeSeed("ember-vault__7")).toBe("ember-vault__7");
  });

  it("limits seed length and handles empty or malformed URL input", () => {
    expect(normalizeSeed("a".repeat(200))).toHaveLength(DUNGEON_CONFIG.maxSeedLength);
    expect(seedFromSearch("?seed=%E0%A4%A")).toBe("a");
    expect(seedFromSearch("?seed=")).toBeNull();
  });

  it("hashes the same normalized seed deterministically", () => {
    expect(hashSeed("ember-vault")).toBe(hashSeed("ember-vault"));
    expect(deriveAttemptState("ember-vault", 2)).toBe(deriveAttemptState("ember-vault", 2));
  });
});

describe("SeededRandom", () => {
  it("produces the same sequence from the same state", () => {
    const first = new SeededRandom(12345);
    const second = new SeededRandom(12345);
    expect(Array.from({ length: 8 }, () => first.next())).toEqual(
      Array.from({ length: 8 }, () => second.next()),
    );
  });

  it("normally produces different sequences from different states", () => {
    const first = new SeededRandom(12345);
    const second = new SeededRandom(54321);
    expect(Array.from({ length: 8 }, () => first.next())).not.toEqual(
      Array.from({ length: 8 }, () => second.next()),
    );
  });

  it("rejects invalid ranges, empty choices, and probabilities", () => {
    const random = new SeededRandom(1);
    expect(() => random.integer(4, 3)).toThrow(RangeError);
    expect(() => random.integer(0.5, 3)).toThrow(RangeError);
    expect(() => random.choice([])).toThrow(RangeError);
    expect(() => random.boolean(1.1)).toThrow(RangeError);
  });
});

describe("deterministic dungeon generation", () => {
  const seed = "phase-two-structure";
  const layout = generateDungeon(seed);

  it("returns deeply equivalent layouts for the same seed", () => {
    expect(generateDungeon(seed)).toEqual(generateDungeon(seed));
  });

  it("returns the same fingerprint for the same seed", () => {
    expect(generateDungeon(seed).fingerprint).toBe(layout.fingerprint);
  });

  it("returns different fingerprints for representative different seeds", () => {
    const fingerprints = ["ash-library", "cinder-road", "moon-crypt"].map(
      (value) => generateDungeon(value).fingerprint,
    );
    expect(new Set(fingerprints).size).toBe(fingerprints.length);
  });

  it("keeps room count within configured limits", () => {
    expect(layout.rooms.length).toBeGreaterThanOrEqual(DUNGEON_CONFIG.minRooms);
    expect(layout.rooms.length).toBeLessThanOrEqual(DUNGEON_CONFIG.maxRooms);
  });

  it("keeps every room inside the solid outer margin", () => {
    layout.rooms.forEach((room) => {
      expect(room.x).toBeGreaterThanOrEqual(DUNGEON_CONFIG.solidOuterMargin);
      expect(room.y).toBeGreaterThanOrEqual(DUNGEON_CONFIG.solidOuterMargin);
      expect(room.x + room.width).toBeLessThanOrEqual(
        layout.mapWidth - DUNGEON_CONFIG.solidOuterMargin,
      );
      expect(room.y + room.height).toBeLessThanOrEqual(
        layout.mapHeight - DUNGEON_CONFIG.solidOuterMargin,
      );
    });
  });

  it("keeps room rectangles separated by configured padding", () => {
    for (let first = 0; first < layout.rooms.length; first += 1) {
      for (let second = first + 1; second < layout.rooms.length; second += 1) {
        expect(
          roomsRespectPadding(
            layout.rooms[first] as DungeonRoom,
            layout.rooms[second] as DungeonRoom,
          ),
        ).toBe(true);
      }
    }
  });

  it("assigns unique stable room IDs", () => {
    expect(new Set(layout.rooms.map((room) => room.id)).size).toBe(layout.rooms.length);
    expect(layout.rooms.map((room) => room.id)).toEqual(
      Array.from({ length: layout.rooms.length }, (_, index) => index),
    );
  });

  it("builds a connected room graph", () => {
    expect(graphReachableRoomIds(layout).size).toBe(layout.rooms.length);
    expect(layout.connections.length).toBeGreaterThanOrEqual(layout.rooms.length - 1);
  });

  it("places every room centre on floor reachable from spawn", () => {
    const reachable = collectReachableFloorTiles(
      layout.floorMask,
      layout.mapWidth,
      layout.mapHeight,
      {
        x: layout.spawn.tileX,
        y: layout.spawn.tileY,
      },
    );
    layout.rooms.forEach((room) => {
      expect(reachable.has(tileIndex(room.center.x, room.center.y, layout.mapWidth))).toBe(true);
    });
  });

  it("connects every carved floor tile to spawn", () => {
    const reachable = collectReachableFloorTiles(
      layout.floorMask,
      layout.mapWidth,
      layout.mapHeight,
      {
        x: layout.spawn.tileX,
        y: layout.spawn.tileY,
      },
    );
    expect(reachable.size).toBe(layout.floorMask.filter(Boolean).length);
  });

  it("places spawn on walkable floor", () => {
    expect(isWalkableTile(layout, layout.spawn.tileX, layout.spawn.tileY)).toBe(true);
  });

  it("gives spawn a full tile of wall clearance", () => {
    for (let y = layout.spawn.tileY - 1; y <= layout.spawn.tileY + 1; y += 1) {
      for (let x = layout.spawn.tileX - 1; x <= layout.spawn.tileX + 1; x += 1) {
        expect(isWalkableTile(layout, x, y)).toBe(true);
      }
    }
  });

  it("places destination metadata on reachable walkable floor", () => {
    const reachable = collectReachableFloorTiles(
      layout.floorMask,
      layout.mapWidth,
      layout.mapHeight,
      {
        x: layout.spawn.tileX,
        y: layout.spawn.tileY,
      },
    );
    expect(isWalkableTile(layout, layout.destination.tileX, layout.destination.tileY)).toBe(true);
    expect(
      reachable.has(tileIndex(layout.destination.tileX, layout.destination.tileY, layout.mapWidth)),
    ).toBe(true);
  });

  it("uses different rooms for spawn and destination metadata", () => {
    expect(layout.spawnRoomId).not.toBe(layout.destinationRoomId);
  });

  it("derives world pixel dimensions from the tile grid", () => {
    expect(layout.worldWidth).toBe(layout.mapWidth * layout.tileSize);
    expect(layout.worldHeight).toBe(layout.mapHeight * layout.tileSize);
  });

  it("covers every wall tile with merged collision rectangles", () => {
    const coverage = Array<boolean>(layout.wallMask.length).fill(false);
    layout.collisionRectangles.forEach((rectangle) => {
      for (
        let y = rectangle.startTileY;
        y < rectangle.startTileY + rectangle.heightInTiles;
        y += 1
      ) {
        for (
          let x = rectangle.startTileX;
          x < rectangle.startTileX + rectangle.widthInTiles;
          x += 1
        ) {
          coverage[tileIndex(x, y, layout.mapWidth)] = true;
        }
      }
    });
    expect(coverage).toEqual(layout.wallMask);
    expect(layout.collisionRectangles.length).toBeLessThan(layout.wallMask.filter(Boolean).length);
  });

  it("never places collision geometry over walkable floor centres", () => {
    layout.collisionRectangles.forEach((rectangle) => {
      for (
        let y = rectangle.startTileY;
        y < rectangle.startTileY + rectangle.heightInTiles;
        y += 1
      ) {
        for (
          let x = rectangle.startTileX;
          x < rectangle.startTileX + rectangle.widthInTiles;
          x += 1
        ) {
          expect(layout.floorMask[tileIndex(x, y, layout.mapWidth)]).toBe(false);
        }
      }
    });
  });

  it("terminates inside the configured bounded attempt count", () => {
    expect(layout.generationAttempt).toBeGreaterThanOrEqual(1);
    expect(layout.generationAttempt).toBeLessThanOrEqual(DUNGEON_CONFIG.maxDungeonAttempts);
  });

  it("passes the dedicated validation layer", () => {
    expect(validateDungeon(layout)).toEqual({ valid: true, errors: [] });
  });

  it("validates a representative batch of 100 deterministic seeds", () => {
    for (let index = 0; index < 100; index += 1) {
      const batchLayout = generateDungeon(`batch-${index.toString().padStart(3, "0")}`);
      const result = validateDungeon(batchLayout);
      expect(result.errors, batchLayout.seed).toEqual([]);
      expect(batchLayout.rooms.length).toBeGreaterThanOrEqual(DUNGEON_CONFIG.minRooms);
      expect(batchLayout.generationAttempt).toBeLessThanOrEqual(DUNGEON_CONFIG.maxDungeonAttempts);
    }
  });
});
