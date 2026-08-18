import { hashSeed, normalizeSeed } from "../dungeon/seed";
import { RUN_CONFIG } from "./config";
import type { FloorNumber } from "./types";

function hashText(value: string): string {
  return hashSeed(value).toString(16).padStart(8, "0");
}

export function deriveFloorSeed(runSeedInput: string, floorNumber: FloorNumber): string {
  const runSeed = normalizeSeed(runSeedInput);
  if (floorNumber === 1) return runSeed;
  if (floorNumber !== 2 && floorNumber !== 3) {
    throw new RangeError(
      `Floor seed derivation supports floors 1, 2, and 3; received ${floorNumber}.`,
    );
  }
  const prefix = runSeed.slice(0, 27).replace(/[-_]+$/g, "") || "run";
  const hash = hashText(
    `floor-seed-v${RUN_CONFIG.floorSeedContractVersion}|${runSeed}|${floorNumber}`,
  );
  return normalizeSeed(`f${floorNumber}-${hash}-${prefix}`);
}

export function deriveFloorSeeds(runSeedInput: string): readonly Readonly<{
  floorNumber: FloorNumber;
  seed: string;
}>[] {
  const seeds = ([1, 2, 3] as const).map((floorNumber) =>
    Object.freeze({ floorNumber, seed: deriveFloorSeed(runSeedInput, floorNumber) }),
  );
  if (new Set(seeds.map((entry) => entry.seed)).size !== 3) {
    throw new RangeError("The three derived floor seeds must be unique.");
  }
  return Object.freeze(seeds);
}
