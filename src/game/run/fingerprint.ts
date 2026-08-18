import { hashSeed } from "../dungeon/seed";
import { RUN_CONFIG } from "./config";
import type { FloorPlanBundle, RunPlan } from "./types";

function floorContract(floor: FloorPlanBundle): string {
  const difficulty = floor.difficulty;
  return [
    floor.floorNumber,
    floor.floorSeed,
    floor.theme.id,
    difficulty.id,
    difficulty.enemyMaximumHealthBonus,
    difficulty.enemyMovementSpeedMultiplier,
    difficulty.enemyActionCooldownMultiplier,
    difficulty.ashWispProjectileSpeedMultiplier,
    difficulty.stoneWardenChargeSpeedMultiplier,
    floor.layout.fingerprint,
    floor.objective.fingerprint,
    floor.encounter.fingerprint,
    floor.loot.fingerprint,
  ].join(":");
}

export function recomputeRunFingerprint(
  runSeed: string,
  floors: readonly FloorPlanBundle[],
): string {
  const contract = [
    `run-v${RUN_CONFIG.contractVersion}`,
    runSeed,
    RUN_CONFIG.floorCount,
    `floor-seed-v${RUN_CONFIG.floorSeedContractVersion}`,
    ...floors.map(floorContract),
    `transition-heal:${RUN_CONFIG.transitionHealing}`,
    "carry:health,available-shards,total-shards,selected-upgrades",
    `forge:${RUN_CONFIG.firstForgeCost},${RUN_CONFIG.secondForgeCost}`,
    `floor-max:${RUN_CONFIG.maximumPurchasesPerFloor}`,
    `run-max:${RUN_CONFIG.maximumPurchasesPerRun}`,
  ].join("|");
  return `rn-${hashSeed(contract).toString(16).padStart(8, "0")}`;
}

export function createRunFingerprint(plan: Omit<RunPlan, "fingerprint">): string {
  return recomputeRunFingerprint(plan.runSeed, plan.floors);
}
