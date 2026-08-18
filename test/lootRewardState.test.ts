import { describe, expect, it } from "vitest";

import {
  closeForgeOffer,
  collectShardPickup,
  createInitialRewardState,
  openForgeOffer,
  openRewardChest,
  recordFlaskConsumption,
  selectForgeUpgrade,
} from "../src/game/loot/rewardState";
import { createUpgradeOffer } from "../src/game/upgrades/offer";

function readyFirstForge() {
  return collectShardPickup(createInitialRewardState(), "shards-1", 6).state;
}

describe("run reward state", () => {
  it("starts empty with the first six-shard cost", () => {
    const state = createInitialRewardState();
    expect(state.availableShards).toBe(0);
    expect(state.totalCollectedShards).toBe(0);
    expect(state.openedChestIds.size).toBe(0);
    expect(state.selectedUpgradeIds).toEqual([]);
    expect(state.forge).toEqual({ status: "dormant", cost: 6 });
  });

  it("collects integer and multi-value shards exactly once", () => {
    const first = collectShardPickup(createInitialRewardState(), "pickup", 4);
    expect(first.state.availableShards).toBe(4);
    expect(first.state.totalCollectedShards).toBe(4);
    const duplicate = collectShardPickup(first.state, "pickup", 4);
    expect(duplicate.outcome).toBe("duplicate");
    expect(duplicate.state).toBe(first.state);
  });

  it("rejects invalid shard amounts", () => {
    expect(() => collectShardPickup(createInitialRewardState(), "pickup", 0)).toThrow();
    expect(() => collectShardPickup(createInitialRewardState(), "pickup", 1.5)).toThrow();
  });

  it("opens a chest once and records successful flask consumption once", () => {
    const chest = openRewardChest(createInitialRewardState(), "chest-01");
    expect(chest.state.openedChestIds.has("chest-01")).toBe(true);
    expect(openRewardChest(chest.state, "chest-01").outcome).toBe("duplicate");
    const flask = recordFlaskConsumption(chest.state, "flask-01");
    expect(flask.state.flasksConsumed).toBe(1);
    expect(recordFlaskConsumption(flask.state, "flask-01").outcome).toBe("duplicate");
  });

  it("becomes ready at the inclusive six-shard boundary", () => {
    expect(collectShardPickup(createInitialRewardState(), "five", 5).state.forge.status).toBe(
      "dormant",
    );
    expect(readyFirstForge().forge.status).toBe("ready");
  });

  it("opening and closing an offer spends nothing", () => {
    const ready = readyFirstForge();
    const offer = createUpgradeOffer("lt-1234abcd", 1, 0, []);
    const opened = openForgeOffer(ready, offer);
    expect(opened.state.availableShards).toBe(6);
    expect(opened.state.forge.status).toBe("choosing");
    const closed = closeForgeOffer(opened.state);
    expect(closed.state.availableShards).toBe(6);
    expect(closed.state.forge.status).toBe("ready");
  });

  it("spends six, advances to eight, then exhausts after the second selection", () => {
    const funded = collectShardPickup(createInitialRewardState(), "all-shards", 14).state;
    const firstOffer = createUpgradeOffer("lt-1234abcd", 1, 0, []);
    const firstOpened = openForgeOffer(funded, firstOffer).state;
    const firstId = firstOffer.upgradeIds[0]!;
    const first = selectForgeUpgrade(firstOpened, firstId);
    expect(first.outcome).toBe("selected");
    expect(first.state.availableShards).toBe(8);
    expect(first.state.forge).toEqual({ status: "ready", cost: 8 });
    const secondOffer = createUpgradeOffer("lt-1234abcd", 1, 1, [firstId]);
    const secondOpened = openForgeOffer(first.state, secondOffer).state;
    const second = selectForgeUpgrade(secondOpened, secondOffer.upgradeIds[0]!);
    expect(second.state.availableShards).toBe(0);
    expect(second.state.forge).toEqual({ status: "exhausted", cost: null });
    expect(second.state.selectedUpgradeIds).toHaveLength(2);
    expect(openForgeOffer(second.state, secondOffer).outcome).toBe("ignored");
  });

  it("rejects unaffordable, duplicate, invalid, and out-of-offer selections", () => {
    const ready = readyFirstForge();
    const offer = createUpgradeOffer("lt-1234abcd", 1, 0, []);
    const choosing = openForgeOffer(ready, offer).state;
    expect(() => selectForgeUpgrade(choosing, "not-an-upgrade")).toThrow(/Unknown/);
    const outside = [
      "tempered-edge",
      "long-reach",
      "quickened-steel",
      "fleet-sigil",
      "vital-rune",
      "aegis-rune",
    ].find((id) => !offer.upgradeIds.includes(id as never))!;
    expect(() => selectForgeUpgrade(choosing, outside)).toThrow(/not in the current offer/);
  });

  it("reset creates a fresh first-cost state", () => {
    expect(createInitialRewardState()).toEqual(createInitialRewardState());
  });
});
