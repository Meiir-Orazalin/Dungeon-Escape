import { OBJECTIVE_CONFIG } from "../objective/config";
import { isWithinInteractionRadius, squaredDistance } from "../objective/interaction";

export type GameplayInteractionType = "key" | "gate" | "chest" | "forge";

export interface GameplayInteractionCandidate {
  readonly id: string;
  readonly type: GameplayInteractionType;
  readonly position: Readonly<{ x: number; y: number }>;
  readonly available: boolean;
}

const PRIORITY: Readonly<Record<GameplayInteractionType, number>> = Object.freeze({
  key: 0,
  gate: 1,
  chest: 2,
  forge: 3,
});

export function selectGameplayInteractionTarget(
  playerPosition: Readonly<{ x: number; y: number }>,
  candidates: readonly GameplayInteractionCandidate[],
  radius = OBJECTIVE_CONFIG.interactionRadius,
): GameplayInteractionCandidate | null {
  return (
    candidates
      .filter(
        (candidate) =>
          candidate.available &&
          isWithinInteractionRadius(playerPosition, candidate.position, radius),
      )
      .map((candidate) => ({
        candidate,
        distance: squaredDistance(playerPosition, candidate.position),
      }))
      .sort(
        (left, right) =>
          left.distance - right.distance ||
          PRIORITY[left.candidate.type] - PRIORITY[right.candidate.type] ||
          left.candidate.id.localeCompare(right.candidate.id),
      )[0]?.candidate ?? null
  );
}
