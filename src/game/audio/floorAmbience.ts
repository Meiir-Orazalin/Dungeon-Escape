import type { FloorNumber } from "../run/types";
import type { FloorAmbienceId } from "./types";

export function ambienceForFloor(floor: FloorNumber): FloorAmbienceId {
  if (floor === 1) return "ambience-catacombs";
  if (floor === 2) return "ambience-ember-vaults";
  if (floor === 3) return "ambience-obsidian-sanctum";
  throw new RangeError(`No ambience exists for floor ${floor}.`);
}
