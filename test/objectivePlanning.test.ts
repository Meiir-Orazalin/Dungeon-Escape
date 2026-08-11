import { describe, expect, it } from "vitest";

import { createEscapeObjective } from "../src/game/objective/createEscapeObjective";
import {
  buildRoomAdjacency,
  calculateRoomDistances,
  selectKeyRoomId,
} from "../src/game/objective/graph";
import { validateEscapeObjective } from "../src/game/objective/validateEscapeObjective";
import { generateDungeon } from "../src/game/dungeon/generateDungeon";
import { isWalkableTile } from "../src/game/dungeon/navigation";
import type { DungeonLayout, DungeonRoom, RoomConnection } from "../src/game/dungeon/types";

function connection(first: DungeonRoom, second: DungeonRoom): RoomConnection {
  return {
    fromRoomId: first.id,
    toRoomId: second.id,
    orientation: "horizontal-first",
    waypoints: [first.center, { x: second.center.x, y: first.center.y }, second.center],
  };
}

function linearRooms(count: number): DungeonRoom[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: id * 10 + 2,
    y: 2,
    width: 7,
    height: 7,
    center: { x: id * 10 + 5, y: 5 },
  }));
}

function linearConnections(rooms: readonly DungeonRoom[]): RoomConnection[] {
  return rooms.slice(1).map((room, index) => connection(rooms[index] as DungeonRoom, room));
}

function hasClearance(layout: DungeonLayout, tileX: number, tileY: number): boolean {
  for (let y = tileY - 1; y <= tileY + 1; y += 1) {
    for (let x = tileX - 1; x <= tileX + 1; x += 1) {
      if (!isWalkableTile(layout, x, y)) return false;
    }
  }
  return true;
}

describe("escape objective planning", () => {
  const layout = generateDungeon("objective-contract");
  const plan = createEscapeObjective(layout);

  it("produces deeply equivalent plans for the same layout", () => {
    expect(createEscapeObjective(layout)).toEqual(createEscapeObjective(layout));
  });

  it("produces the same objective fingerprint for the same layout", () => {
    expect(createEscapeObjective(layout).fingerprint).toBe(plan.fingerprint);
  });

  it("normally produces different fingerprints for representative seeds", () => {
    const fingerprints = ["objective-ash", "objective-brass", "objective-cinder"].map(
      (seed) => createEscapeObjective(generateDungeon(seed)).fingerprint,
    );
    expect(new Set(fingerprints).size).toBe(fingerprints.length);
  });

  it("selects a key room distinct from spawn", () => {
    expect(plan.keyRoomId).not.toBe(layout.spawnRoomId);
  });

  it("selects a key room distinct from the gate", () => {
    expect(plan.keyRoomId).not.toBe(plan.gateRoomId);
  });

  it("uses the generated destination room for the gate", () => {
    expect(plan.gateRoomId).toBe(layout.destinationRoomId);
  });

  it("derives the gate position exactly from destination metadata", () => {
    expect(plan.gatePosition).toEqual(layout.destination);
  });

  it("places the Runic Key on walkable floor", () => {
    expect(isWalkableTile(layout, plan.keyPosition.tileX, plan.keyPosition.tileY)).toBe(true);
  });

  it("places the Ancient Gate on walkable floor", () => {
    expect(isWalkableTile(layout, plan.gatePosition.tileX, plan.gatePosition.tileY)).toBe(true);
  });

  it("gives the Runic Key a full tile of clearance", () => {
    expect(hasClearance(layout, plan.keyPosition.tileX, plan.keyPosition.tileY)).toBe(true);
  });

  it("gives the Ancient Gate a full tile of clearance", () => {
    expect(hasClearance(layout, plan.gatePosition.tileX, plan.gatePosition.tileY)).toBe(true);
  });

  it("keeps the key room reachable from spawn", () => {
    const adjacency = buildRoomAdjacency(layout.rooms, layout.connections);
    expect(calculateRoomDistances(adjacency, layout.spawnRoomId).has(plan.keyRoomId)).toBe(true);
  });

  it("keeps the gate reachable from the key room", () => {
    const adjacency = buildRoomAdjacency(layout.rooms, layout.connections);
    expect(calculateRoomDistances(adjacency, plan.keyRoomId).has(plan.gateRoomId)).toBe(true);
  });

  it("uses ascending room ID as the stable final tie-breaker", () => {
    const rooms = linearRooms(6);
    const connections = linearConnections(rooms);
    expect(selectKeyRoomId([...rooms].reverse(), [...connections].reverse(), 0, 5, 2)).toBe(2);
  });

  it("prefers candidates at least two graph edges from both endpoints", () => {
    const rooms = linearRooms(6);
    const connections = linearConnections(rooms);
    const selected = selectKeyRoomId(rooms, connections, 0, 5, 2);
    const adjacency = buildRoomAdjacency(rooms, connections);
    expect(calculateRoomDistances(adjacency, 0).get(selected)).toBeGreaterThanOrEqual(2);
    expect(calculateRoomDistances(adjacency, 5).get(selected)).toBeGreaterThanOrEqual(2);
  });

  it("falls back deterministically when no preferred candidate exists", () => {
    const rooms = linearRooms(3);
    expect(selectKeyRoomId(rooms, linearConnections(rooms), 0, 2, 2)).toBe(1);
  });

  it("returns descriptive errors for an invalid objective plan", () => {
    const validation = validateEscapeObjective(layout, {
      ...plan,
      fingerprint: "broken",
      keyRoomId: layout.spawnRoomId,
    });
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.includes("spawn room"))).toBe(true);
    expect(validation.errors.some((error) => error.includes("fingerprint"))).toBe(true);
  });

  it("validates 100 representative deterministic objective plans", () => {
    for (let index = 0; index < 100; index += 1) {
      const batchLayout = generateDungeon(`objective-batch-${index.toString().padStart(3, "0")}`);
      const batchPlan = createEscapeObjective(batchLayout);
      expect(validateEscapeObjective(batchLayout, batchPlan).errors, batchLayout.seed).toEqual([]);
    }
  });
});
