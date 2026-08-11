import type { WorldPoint } from "../dungeon/types";
import { OBJECTIVE_CONFIG } from "./config";
import type { ObjectiveTargetId } from "./types";

export interface InteractionCandidate {
  readonly id: ObjectiveTargetId;
  readonly position: Readonly<{ x: number; y: number }>;
  readonly available: boolean;
}

export function squaredDistance(
  first: Readonly<{ x: number; y: number }>,
  second: Readonly<{ x: number; y: number }>,
): number {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;
  return deltaX * deltaX + deltaY * deltaY;
}

export function isWithinInteractionRadius(
  playerPosition: Readonly<{ x: number; y: number }>,
  targetPosition: WorldPoint | Readonly<{ x: number; y: number }>,
  radius = OBJECTIVE_CONFIG.interactionRadius,
): boolean {
  if (!Number.isFinite(radius) || radius < 0) return false;
  return squaredDistance(playerPosition, targetPosition) <= radius * radius;
}

export function selectInteractionTarget(
  playerPosition: Readonly<{ x: number; y: number }>,
  candidates: readonly InteractionCandidate[],
  radius = OBJECTIVE_CONFIG.interactionRadius,
): ObjectiveTargetId | null {
  const priority: Record<ObjectiveTargetId, number> = { key: 0, gate: 1 };
  return (
    candidates
      .filter(
        (candidate) =>
          candidate.available &&
          isWithinInteractionRadius(playerPosition, candidate.position, radius),
      )
      .map((candidate) => ({
        id: candidate.id,
        distance: squaredDistance(playerPosition, candidate.position),
      }))
      .sort(
        (left, right) => left.distance - right.distance || priority[left.id] - priority[right.id],
      )[0]?.id ?? null
  );
}
