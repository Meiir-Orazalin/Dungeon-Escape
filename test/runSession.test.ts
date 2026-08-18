import { describe, expect, it } from "vitest";

import { createRunPlan } from "../src/game/run/createRunPlan";
import {
  advanceFloorCheckpoint,
  applyTransitionHealing,
  commitFloorSummary,
  createEmptyFloorStatistics,
  createEmptyRunStatistics,
  createFloorEntryCheckpoint,
  createFloorSummary,
  createInitialRunSession,
  createRunCarryState,
  restoreRunSessionFromCheckpoint,
  safeTimerDelta,
  setRunSessionActivity,
  setRunSessionOutcome,
} from "../src/game/run/session";

const plan = createRunPlan("phase6-session-contract");

function floorOneSummary() {
  return createFloorSummary(
    plan.floors[0]!,
    12_345,
    3,
    {
      ...createEmptyFloorStatistics(),
      roomsDiscovered: 8,
      enemiesDefeated: 4,
      chestsOpened: 2,
      shardsCollected: 9,
      flasksConsumed: 1,
      upgradesSelected: 1,
      damageAccepted: 2,
    },
    3,
    ["tempered-edge"],
    ["tempered-edge"],
  );
}

describe("Phase 6 run session, checkpoints, and transitions", () => {
  it("creates a coherent immutable Floor 1 session", () => {
    const session = createInitialRunSession(plan);
    expect(session.currentFloorNumber).toBe(1);
    expect(session.outcome).toBe("active");
    expect(session.activity).toBe("playing");
    expect(session.carry).toEqual({
      currentHealth: 5,
      availableShards: 0,
      totalCollectedShards: 0,
      selectedUpgradeIds: [],
    });
    expect(session.cumulativeStats).toEqual(createEmptyRunStatistics());
    expect(session.completedFloors).toEqual([]);
    expect(session.floorEntryCheckpoint.runElapsedMs).toBe(0);
  });

  it("enforces coherent carry state", () => {
    expect(createRunCarryState(4, 3, 9, ["tempered-edge"])).toEqual({
      currentHealth: 4,
      availableShards: 3,
      totalCollectedShards: 9,
      selectedUpgradeIds: ["tempered-edge"],
    });
    expect(() => createRunCarryState(0)).toThrow(/positive/);
    expect(() => createRunCarryState(5, 4, 3)).toThrow(/exceed/);
  });

  it("commits one FloorSummary idempotently with exact cumulative statistics", () => {
    const summary = floorOneSummary();
    const first = commitFloorSummary(createEmptyRunStatistics(), [], summary);
    expect(first.completedFloors).toEqual([summary]);
    expect(first.statistics).toEqual({
      enemiesDefeated: 4,
      roomsDiscovered: 8,
      chestsOpened: 2,
      shardsCollected: 9,
      flasksConsumed: 1,
      upgradesSelected: 1,
      damageAccepted: 2,
      completedFloorCount: 1,
    });
    expect(commitFloorSummary(first.statistics, first.completedFloors, summary)).toEqual(first);
  });

  it("creates Floor 2 and Floor 3 checkpoints with carry and one-point healing", () => {
    const floor1 = createInitialRunSession(plan).floorEntryCheckpoint;
    const floor2 = advanceFloorCheckpoint(
      floor1,
      floorOneSummary(),
      createRunCarryState(3, 3, 9, ["tempered-edge"]),
      5,
      12_345,
    );
    expect(floor2.floorNumber).toBe(2);
    expect(floor2.carry.currentHealth).toBe(4);
    expect(floor2.carry.availableShards).toBe(3);
    expect(floor2.carry.selectedUpgradeIds).toEqual(["tempered-edge"]);
    expect(floor2.runElapsedMs).toBe(12_345);
    expect(floor2.completedFloors).toHaveLength(1);

    const floor2Summary = createFloorSummary(
      plan.floors[1]!,
      20_000,
      4,
      createEmptyFloorStatistics(),
      3,
      [],
      ["tempered-edge"],
    );
    const floor3 = advanceFloorCheckpoint(floor2, floor2Summary, floor2.carry, 5, 32_345);
    expect(floor3.floorNumber).toBe(3);
    expect(floor3.carry.currentHealth).toBe(5);
    expect(floor3.completedFloors).toHaveLength(2);
    expect(() => advanceFloorCheckpoint(floor3, floor2Summary, floor3.carry, 5, 40_000)).toThrow(
      /fourth floor/,
    );
  });

  it("restores a current-floor replay exactly from its entry checkpoint", () => {
    const carry = createRunCarryState(4, 5, 18, ["tempered-edge", "windstep-sigil"]);
    const checkpoint = createFloorEntryCheckpoint(
      2,
      carry,
      24_000,
      { ...createEmptyRunStatistics(), completedFloorCount: 1 },
      [floorOneSummary()],
    );
    const restored = restoreRunSessionFromCheckpoint(plan, checkpoint);
    expect(restored.currentFloorNumber).toBe(2);
    expect(restored.carry).toBe(carry);
    expect(restored.floorEntryCheckpoint).toBe(checkpoint);
    expect(restored.runFingerprint).toBe(plan.fingerprint);
    expect(restored.activity).toBe("playing");
  });

  it("models active overlays and terminal outcomes without contradiction", () => {
    const initial = createInitialRunSession(plan);
    expect(setRunSessionActivity(initial, "choosing-upgrade").activity).toBe("choosing-upgrade");
    expect(setRunSessionActivity(initial, "floor-cleared").activity).toBe("floor-cleared");
    const defeated = setRunSessionOutcome(initial, "defeated");
    expect(defeated.outcome).toBe("defeated");
    expect(defeated.activity).toBe("playing");
    expect(setRunSessionOutcome(defeated, "escaped")).toBe(defeated);
    expect(() => setRunSessionActivity(defeated, "floor-cleared")).toThrow(/Terminal/);
  });

  it("applies bounded transition healing and defensive timer deltas", () => {
    expect(applyTransitionHealing(3, 5)).toBe(4);
    expect(applyTransitionHealing(5, 5)).toBe(5);
    expect(() => applyTransitionHealing(0, 5)).toThrow(/revive/);
    expect(safeTimerDelta(16)).toBe(16);
    expect(safeTimerDelta(-1)).toBe(0);
    expect(safeTimerDelta(Number.NaN)).toBe(0);
  });
});
