import { generateDungeon } from "../dungeon/generateDungeon";
import { normalizeSeed } from "../dungeon/seed";
import { createEncounterPlan } from "../encounters/createEncounterPlan";
import { createLootPlan } from "../loot/createLootPlan";
import { createEscapeObjective } from "../objective/createEscapeObjective";
import { getFloorDifficulty } from "./difficulty";
import { deriveFloorSeeds } from "./floorSeeds";
import { recomputeRunFingerprint } from "./fingerprint";
import { getFloorTheme } from "./themes";
import type { FloorPlanBundle, RunPlan } from "./types";
import { validateRunPlan } from "./validateRunPlan";

export function createRunPlan(runSeedInput: string): RunPlan {
  const runSeed = normalizeSeed(runSeedInput);
  const floors = Object.freeze(
    deriveFloorSeeds(runSeed).map(({ floorNumber, seed }): FloorPlanBundle => {
      const layout = generateDungeon(seed);
      const objective = createEscapeObjective(layout);
      const encounter = createEncounterPlan(layout, objective);
      const loot = createLootPlan(layout, objective, encounter);
      return Object.freeze({
        floorNumber,
        floorSeed: seed,
        theme: getFloorTheme(floorNumber),
        difficulty: getFloorDifficulty(floorNumber),
        layout,
        objective,
        encounter,
        loot,
      });
    }),
  );
  const plan: RunPlan = Object.freeze({
    runSeed,
    fingerprint: recomputeRunFingerprint(runSeed, floors),
    floors,
  });
  const validation = validateRunPlan(plan);
  if (!validation.valid) {
    throw new Error(`RunPlan ${runSeed} is invalid: ${validation.errors.join(" ")}`);
  }
  return plan;
}
