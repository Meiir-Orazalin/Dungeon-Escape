import { describe, expect, it } from "vitest";

import { createRoomDiscovery, updateRoomDiscovery } from "../src/game/dungeon/discovery";
import { findRoomAtTile } from "../src/game/dungeon/navigation";
import type { DungeonRoom } from "../src/game/dungeon/types";

const ROOMS: readonly DungeonRoom[] = [
  { id: 0, x: 2, y: 2, width: 7, height: 6, center: { x: 5, y: 5 } },
  { id: 1, x: 14, y: 3, width: 8, height: 7, center: { x: 18, y: 6 } },
];

describe("room discovery", () => {
  it("starts with only the spawn room discovered", () => {
    const state = createRoomDiscovery(0);
    expect([...state.discoveredRoomIds]).toEqual([0]);
    expect(state.currentRoomId).toBe(0);
  });

  it("discovers a room when its bounds are entered", () => {
    const state = updateRoomDiscovery(createRoomDiscovery(0), ROOMS, 14, 3);
    expect([...state.discoveredRoomIds]).toEqual([0, 1]);
    expect(state.currentRoomId).toBe(1);
  });

  it("does not duplicate a room when it is re-entered", () => {
    const discovered = updateRoomDiscovery(createRoomDiscovery(0), ROOMS, 14, 3);
    const corridor = updateRoomDiscovery(discovered, ROOMS, 11, 3);
    const reentered = updateRoomDiscovery(corridor, ROOMS, 14, 3);
    expect([...reentered.discoveredRoomIds]).toEqual([0, 1]);
  });

  it("retains the last current room while the player is in a corridor", () => {
    const initial = createRoomDiscovery(0);
    expect(updateRoomDiscovery(initial, ROOMS, 11, 3)).toBe(initial);
  });

  it("reports the correct discovered count", () => {
    const state = updateRoomDiscovery(createRoomDiscovery(0), ROOMS, 18, 6);
    expect(state.discoveredRoomIds.size).toBe(2);
  });

  it("uses inclusive lower and exclusive upper room boundaries", () => {
    expect(findRoomAtTile(ROOMS, 2, 2)?.id).toBe(0);
    expect(findRoomAtTile(ROOMS, 8, 7)?.id).toBe(0);
    expect(findRoomAtTile(ROOMS, 9, 7)).toBeNull();
    expect(findRoomAtTile(ROOMS, 8, 8)).toBeNull();
  });
});
