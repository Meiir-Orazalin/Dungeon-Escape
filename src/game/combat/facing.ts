import type { MovementInput } from "../input/movement";
import type { Vector2 } from "./types";

export const DEFAULT_FACING: Vector2 = Object.freeze({ x: 1, y: 0 });

export function normalizeDirection(
  direction: Vector2,
  fallback: Vector2 = DEFAULT_FACING,
): Vector2 {
  const magnitude = Math.hypot(direction.x, direction.y);
  if (Number.isFinite(magnitude) && magnitude > 0) {
    return Object.freeze({ x: direction.x / magnitude, y: direction.y / magnitude });
  }
  const fallbackMagnitude = Math.hypot(fallback.x, fallback.y);
  if (Number.isFinite(fallbackMagnitude) && fallbackMagnitude > 0) {
    return Object.freeze({ x: fallback.x / fallbackMagnitude, y: fallback.y / fallbackMagnitude });
  }
  return DEFAULT_FACING;
}

export function facingFromMovement(input: MovementInput, previous: Vector2): Vector2 {
  const direction = {
    x: Number(input.right) - Number(input.left),
    y: Number(input.down) - Number(input.up),
  };
  return direction.x === 0 && direction.y === 0
    ? normalizeDirection(previous)
    : normalizeDirection(direction, previous);
}

export function directionBetween(from: Vector2, to: Vector2, fallback = DEFAULT_FACING): Vector2 {
  return normalizeDirection({ x: to.x - from.x, y: to.y - from.y }, fallback);
}
