import { describe, expect, it } from "vitest";

import { createRoomDiscovery } from "../src/game/dungeon/discovery";
import { selectGameplayInteractionTarget } from "../src/game/interaction/selection";
import {
  formatChestProgress,
  formatSelectedUpgradeNames,
  formatShardProgress,
  formatUpgradeProgress,
} from "../src/game/loot/hudFormat";
import { deriveLootMinimapMarkers } from "../src/game/loot/minimapLoot";
import { createInitialRewardState } from "../src/game/loot/rewardState";
import type { LootPlan } from "../src/game/loot/types";

describe("general interaction selection", () => {
  const player = { x: 0, y: 0 };

  it("accepts closed chests and forge on the inclusive 52-pixel boundary", () => {
    expect(
      selectGameplayInteractionTarget(player, [
        { id: "chest", type: "chest", position: { x: 52, y: 0 }, available: true },
      ])?.id,
    ).toBe("chest");
    expect(
      selectGameplayInteractionTarget(player, [
        { id: "forge", type: "forge", position: { x: 0, y: 52 }, available: true },
      ])?.id,
    ).toBe("forge");
  });

  it("rejects unavailable/open/exhausted targets and targets outside range", () => {
    expect(
      selectGameplayInteractionTarget(player, [
        { id: "open", type: "chest", position: { x: 1, y: 0 }, available: false },
        { id: "far", type: "forge", position: { x: 53, y: 0 }, available: true },
      ]),
    ).toBeNull();
  });

  it("chooses nearest first and stable type/ID priority on exact ties", () => {
    expect(
      selectGameplayInteractionTarget(player, [
        { id: "key", type: "key", position: { x: 20, y: 0 }, available: true },
        { id: "chest", type: "chest", position: { x: 10, y: 0 }, available: true },
      ])?.id,
    ).toBe("chest");
    expect(
      selectGameplayInteractionTarget(player, [
        { id: "forge", type: "forge", position: { x: -10, y: 0 }, available: true },
        { id: "gate", type: "gate", position: { x: 10, y: 0 }, available: true },
      ])?.id,
    ).toBe("gate");
    expect(
      selectGameplayInteractionTarget(player, [
        { id: "chest-b", type: "chest", position: { x: -10, y: 0 }, available: true },
        { id: "chest-a", type: "chest", position: { x: 10, y: 0 }, available: true },
      ])?.id,
    ).toBe("chest-a");
  });
});

describe("loot minimap and HUD helpers", () => {
  const plan: LootPlan = {
    fingerprint: "lt-1234abcd",
    forge: { roomId: 0, position: { x: 16, y: 16, tileX: 0, tileY: 0 } },
    chests: [
      {
        id: "chest-01",
        roomId: 1,
        position: { x: 48, y: 16, tileX: 1, tileY: 0 },
        shardAmount: 3,
        containsFlask: true,
      },
    ],
    enemyRewards: [],
    totalPlannedShards: 14,
    guaranteedFlaskCount: 1,
  };

  it("hides undiscovered chests, reveals discovered closed chests, and removes opened ones", () => {
    expect(
      deriveLootMinimapMarkers(createRoomDiscovery(0), plan, new Set(), "dormant").chestRoomIds,
    ).toEqual([]);
    const discovered = { currentRoomId: 1, discoveredRoomIds: new Set([0, 1]) };
    expect(deriveLootMinimapMarkers(discovered, plan, new Set(), "ready")).toEqual({
      chestRoomIds: [1],
      forge: "ready",
    });
    expect(deriveLootMinimapMarkers(discovered, plan, new Set(["chest-01"]), "exhausted")).toEqual({
      chestRoomIds: [],
      forge: "exhausted",
    });
    expect(discovered.discoveredRoomIds).toEqual(new Set([0, 1]));
  });

  it("formats shard, chest, rune, and build state stably", () => {
    const initial = createInitialRewardState();
    expect(formatShardProgress(4, initial.forge)).toBe("4 / 6");
    expect(formatChestProgress(1, 3)).toBe("1 / 3");
    expect(formatUpgradeProgress(1)).toBe("1 / 2");
    expect(formatUpgradeProgress(2)).toBe("COMPLETE");
    expect(formatSelectedUpgradeNames([])).toBe("NONE");
    expect(formatSelectedUpgradeNames(["tempered-edge", "vital-rune"])).toBe("EDGE + VITAL");
  });
});
