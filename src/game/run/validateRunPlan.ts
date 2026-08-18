import { normalizeSeed } from "../dungeon/seed";
import { validateDungeon } from "../dungeon/validateDungeon";
import { validateEncounterPlan } from "../encounters/validateEncounterPlan";
import { validateLootPlan } from "../loot/validateLootPlan";
import { validateEscapeObjective } from "../objective/validateEscapeObjective";
import { RUN_CONFIG } from "./config";
import { deriveFloorSeed } from "./floorSeeds";
import { recomputeRunFingerprint } from "./fingerprint";
import { getFloorDifficulty } from "./difficulty";
import { getFloorTheme } from "./themes";
import type { FloorNumber, RunPlan, RunPlanValidationResult } from "./types";

export function validateRunPlan(plan: RunPlan): RunPlanValidationResult {
  const errors: string[] = [];
  const context = `Run ${plan.runSeed}`;
  if (!/^rn-[0-9a-f]{8}$/.test(plan.fingerprint)) {
    errors.push(`${context}: run fingerprint must use rn-xxxxxxxx.`);
  } else if (plan.fingerprint !== recomputeRunFingerprint(plan.runSeed, plan.floors)) {
    errors.push(`${context}: run fingerprint does not match the ordered run structure.`);
  }
  if (plan.runSeed !== normalizeSeed(plan.runSeed)) {
    errors.push(`${context}: run seed must be normalized.`);
  }
  if (plan.floors.length !== RUN_CONFIG.floorCount) {
    errors.push(`${context}: exactly three floor bundles are required.`);
  }
  const expectedNumbers = [1, 2, 3];
  if (plan.floors.some((floor, index) => floor.floorNumber !== expectedNumbers[index])) {
    errors.push(`${context}: floor numbers must be exactly 1, 2, 3 in order.`);
  }
  if (new Set(plan.floors.map((floor) => floor.floorSeed)).size !== plan.floors.length) {
    errors.push(`${context}: all floor seeds must be distinct.`);
  }
  plan.floors.forEach((floor) => {
    const floorContext = `${context}, floor ${floor.floorNumber}`;
    const expectedSeed = deriveFloorSeed(plan.runSeed, floor.floorNumber as FloorNumber);
    if (!floor.floorSeed || floor.floorSeed !== normalizeSeed(floor.floorSeed)) {
      errors.push(`${floorContext}: floor seed must be a non-empty normalized string.`);
    }
    if (floor.floorSeed !== expectedSeed) {
      errors.push(`${floorContext}: floor seed does not match the derivation contract.`);
    }
    if (floor.layout.seed !== floor.floorSeed) {
      errors.push(`${floorContext}: layout seed must equal its floor seed.`);
    }
    if (floor.theme.id !== getFloorTheme(floor.floorNumber).id) {
      errors.push(`${floorContext}: theme does not match the floor number.`);
    }
    if (floor.difficulty.id !== getFloorDifficulty(floor.floorNumber).id) {
      errors.push(`${floorContext}: difficulty does not match the floor number.`);
    }
    const difficultyNumbers = [
      floor.difficulty.enemyMaximumHealthBonus,
      floor.difficulty.enemyMovementSpeedMultiplier,
      floor.difficulty.enemyActionCooldownMultiplier,
      floor.difficulty.ashWispProjectileSpeedMultiplier,
      floor.difficulty.stoneWardenChargeSpeedMultiplier,
    ];
    if (!difficultyNumbers.every(Number.isFinite)) {
      errors.push(`${floorContext}: difficulty values must be finite.`);
    }
    if (
      !Number.isInteger(floor.difficulty.enemyMaximumHealthBonus) ||
      floor.difficulty.enemyMaximumHealthBonus < 0
    ) {
      errors.push(`${floorContext}: enemy maximum-health bonus must be a non-negative integer.`);
    }
    if (!difficultyNumbers.slice(1).every((value) => value > 0)) {
      errors.push(`${floorContext}: difficulty multipliers must be positive.`);
    }
    const validators = [
      ["layout", validateDungeon(floor.layout)],
      ["objective", validateEscapeObjective(floor.layout, floor.objective)],
      ["encounter", validateEncounterPlan(floor.layout, floor.objective, floor.encounter)],
      ["loot", validateLootPlan(floor.layout, floor.objective, floor.encounter, floor.loot)],
    ] as const;
    validators.forEach(([subsystem, validation]) => {
      validation.errors.forEach((reason) =>
        errors.push(`${floorContext}, ${subsystem}: ${reason}`),
      );
    });
    if (floor.loot.chests.length !== 3) {
      errors.push(`${floorContext}, loot: exactly three Treasure Chests are required.`);
    }
    if (floor.loot.totalPlannedShards < 14) {
      errors.push(`${floorContext}, loot: at least 14 planned shards are required.`);
    }
  });
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
