import { COMBAT_CONFIG } from "../combat/config";
import { stableUpgradeIds } from "../upgrades/catalog";
import type { UpgradeId } from "../upgrades/types";
import { RUN_CONFIG } from "./config";
import type {
  ActiveRunActivity,
  CurrentFloorStatistics,
  FloorEntryCheckpoint,
  FloorNumber,
  FloorPlanBundle,
  FloorSummary,
  RunCarryState,
  RunPlan,
  RunSession,
  RunStatistics,
} from "./types";

export function createEmptyRunStatistics(): RunStatistics {
  return Object.freeze({
    enemiesDefeated: 0,
    roomsDiscovered: 0,
    chestsOpened: 0,
    shardsCollected: 0,
    flasksConsumed: 0,
    upgradesSelected: 0,
    damageAccepted: 0,
    completedFloorCount: 0,
  });
}

export function createEmptyFloorStatistics(): CurrentFloorStatistics {
  return Object.freeze({
    enemiesDefeated: 0,
    roomsDiscovered: 1,
    chestsOpened: 0,
    shardsCollected: 0,
    flasksConsumed: 0,
    upgradesSelected: 0,
    damageAccepted: 0,
  });
}

export function createRunCarryState(
  currentHealth: number,
  availableShards = 0,
  totalCollectedShards = 0,
  selectedUpgradeIds: readonly UpgradeId[] = [],
): RunCarryState {
  if (!Number.isInteger(currentHealth) || currentHealth <= 0) {
    throw new RangeError("Carried health must be a positive integer.");
  }
  if (
    ![availableShards, totalCollectedShards].every((value) => Number.isInteger(value) && value >= 0)
  ) {
    throw new RangeError("Carried shard values must be non-negative integers.");
  }
  if (availableShards > totalCollectedShards) {
    throw new RangeError("Available shards cannot exceed total collected shards.");
  }
  if (
    new Set(selectedUpgradeIds).size !== selectedUpgradeIds.length ||
    selectedUpgradeIds.length > RUN_CONFIG.maximumPurchasesPerRun
  ) {
    throw new RangeError("Carried upgrades must be unique and within the six-upgrade run maximum.");
  }
  return Object.freeze({
    currentHealth,
    availableShards,
    totalCollectedShards,
    selectedUpgradeIds: stableUpgradeIds(selectedUpgradeIds),
  });
}

export function createFloorEntryCheckpoint(
  floorNumber: FloorNumber,
  carry: RunCarryState,
  runElapsedMs: number,
  cumulativeStats: RunStatistics,
  completedFloors: readonly FloorSummary[],
): FloorEntryCheckpoint {
  if (![1, 2, 3].includes(floorNumber))
    throw new RangeError("Checkpoint floor must be 1, 2, or 3.");
  if (!Number.isFinite(runElapsedMs) || runElapsedMs < 0) {
    throw new RangeError("Checkpoint run time must be finite and non-negative.");
  }
  if (completedFloors.length !== floorNumber - 1) {
    throw new RangeError("Checkpoint completed-floor count must precede its floor number.");
  }
  return Object.freeze({
    floorNumber,
    carry,
    runElapsedMs,
    cumulativeStats,
    completedFloors: Object.freeze([...completedFloors]),
  });
}

export function createInitialRunSession(plan: RunPlan): RunSession {
  const carry = createRunCarryState(COMBAT_CONFIG.playerMaximumHealth);
  const cumulativeStats = createEmptyRunStatistics();
  const checkpoint = createFloorEntryCheckpoint(1, carry, 0, cumulativeStats, []);
  return Object.freeze({
    runSeed: plan.runSeed,
    runFingerprint: plan.fingerprint,
    currentFloorNumber: 1,
    outcome: "active",
    activity: "playing",
    carry,
    cumulativeStats,
    completedFloors: Object.freeze([]),
    floorEntryCheckpoint: checkpoint,
  });
}

export function restoreRunSessionFromCheckpoint(
  plan: RunPlan,
  checkpoint: FloorEntryCheckpoint,
): RunSession {
  if (checkpoint.floorNumber > plan.floors.length) {
    throw new RangeError("Checkpoint floor does not exist in the RunPlan.");
  }
  return Object.freeze({
    runSeed: plan.runSeed,
    runFingerprint: plan.fingerprint,
    currentFloorNumber: checkpoint.floorNumber,
    outcome: "active",
    activity: "playing",
    carry: checkpoint.carry,
    cumulativeStats: checkpoint.cumulativeStats,
    completedFloors: checkpoint.completedFloors,
    floorEntryCheckpoint: checkpoint,
  });
}

export function setRunSessionActivity(
  session: RunSession,
  activity: ActiveRunActivity,
): RunSession {
  if (session.outcome !== "active" && activity !== "playing") {
    throw new RangeError("Terminal run outcomes cannot own an active-floor overlay.");
  }
  return Object.freeze({ ...session, activity });
}

export function setRunSessionOutcome(
  session: RunSession,
  outcome: "escaped" | "defeated",
): RunSession {
  if (session.outcome !== "active") return session;
  return Object.freeze({ ...session, outcome, activity: "playing" as const });
}

export function applyTransitionHealing(currentHealth: number, maximumHealth: number): number {
  if (!Number.isInteger(currentHealth) || currentHealth <= 0) {
    throw new RangeError("Transition healing cannot revive defeated health.");
  }
  if (!Number.isInteger(maximumHealth) || maximumHealth <= 0 || currentHealth > maximumHealth) {
    throw new RangeError("Transition healing requires coherent positive health values.");
  }
  return Math.min(maximumHealth, currentHealth + RUN_CONFIG.transitionHealing);
}

export function createFloorSummary(
  floor: FloorPlanBundle,
  elapsedTimeMs: number,
  healthRemaining: number,
  stats: CurrentFloorStatistics,
  availableShards: number,
  floorUpgradeIds: readonly UpgradeId[],
  globalUpgradeIds: readonly UpgradeId[],
): FloorSummary {
  if (!Number.isFinite(elapsedTimeMs) || elapsedTimeMs < 0) {
    throw new RangeError("Floor summary time must be finite and non-negative.");
  }
  return Object.freeze({
    floorNumber: floor.floorNumber,
    floorSeed: floor.floorSeed,
    floorName: floor.theme.name,
    layoutFingerprint: floor.layout.fingerprint,
    objectiveFingerprint: floor.objective.fingerprint,
    encounterFingerprint: floor.encounter.fingerprint,
    lootFingerprint: floor.loot.fingerprint,
    elapsedTimeMs,
    healthRemaining,
    roomsDiscovered: stats.roomsDiscovered,
    totalRooms: floor.layout.rooms.length,
    enemiesDefeated: stats.enemiesDefeated,
    totalEnemies: floor.encounter.enemies.length,
    chestsOpened: stats.chestsOpened,
    totalChests: floor.loot.chests.length,
    shardsCollected: stats.shardsCollected,
    flasksConsumed: stats.flasksConsumed,
    damageAccepted: stats.damageAccepted,
    upgradesSelected: stableUpgradeIds(floorUpgradeIds),
    availableShards,
    globalSelectedUpgradeIds: stableUpgradeIds(globalUpgradeIds),
  });
}

export function commitFloorSummary(
  statistics: RunStatistics,
  completedFloors: readonly FloorSummary[],
  summary: FloorSummary,
): Readonly<{ statistics: RunStatistics; completedFloors: readonly FloorSummary[] }> {
  if (completedFloors.some((floor) => floor.floorNumber === summary.floorNumber)) {
    return Object.freeze({ statistics, completedFloors });
  }
  const nextStatistics: RunStatistics = Object.freeze({
    enemiesDefeated: statistics.enemiesDefeated + summary.enemiesDefeated,
    roomsDiscovered: statistics.roomsDiscovered + summary.roomsDiscovered,
    chestsOpened: statistics.chestsOpened + summary.chestsOpened,
    shardsCollected: statistics.shardsCollected + summary.shardsCollected,
    flasksConsumed: statistics.flasksConsumed + summary.flasksConsumed,
    upgradesSelected: statistics.upgradesSelected + summary.upgradesSelected.length,
    damageAccepted: statistics.damageAccepted + summary.damageAccepted,
    completedFloorCount: statistics.completedFloorCount + 1,
  });
  return Object.freeze({
    statistics: nextStatistics,
    completedFloors: Object.freeze([...completedFloors, summary]),
  });
}

export function advanceFloorCheckpoint(
  current: FloorEntryCheckpoint,
  summary: FloorSummary,
  carryAfterFloor: RunCarryState,
  maximumHealth: number,
  runElapsedMs: number,
): FloorEntryCheckpoint {
  if (current.floorNumber >= 3) throw new RangeError("No fourth floor exists.");
  if (summary.floorNumber !== current.floorNumber) {
    throw new RangeError("Floor summary must match the current checkpoint floor.");
  }
  const committed = commitFloorSummary(current.cumulativeStats, current.completedFloors, summary);
  const healedCarry = createRunCarryState(
    applyTransitionHealing(carryAfterFloor.currentHealth, maximumHealth),
    carryAfterFloor.availableShards,
    carryAfterFloor.totalCollectedShards,
    carryAfterFloor.selectedUpgradeIds,
  );
  return createFloorEntryCheckpoint(
    (current.floorNumber + 1) as FloorNumber,
    healedCarry,
    runElapsedMs,
    committed.statistics,
    committed.completedFloors,
  );
}

export function safeTimerDelta(delta: number): number {
  return Number.isFinite(delta) && delta > 0 ? delta : 0;
}
