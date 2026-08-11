import type { DungeonLayout } from "../dungeon/types";
import { COMBAT_CONFIG } from "./config";
import { normalizeDirection } from "./facing";
import type { Vector2 } from "./types";

export interface MeleeTarget {
  readonly id: string;
  readonly position: Vector2;
  readonly radius: number;
  readonly alive: boolean;
}

export function isTargetInsideMeleeSector(
  origin: Vector2,
  facing: Vector2,
  target: Vector2,
  targetRadius: number,
  range = COMBAT_CONFIG.attackRange,
  fullArcDegrees = COMBAT_CONFIG.attackArcDegrees,
): boolean {
  if (
    ![origin.x, origin.y, target.x, target.y, targetRadius, range, fullArcDegrees].every(
      Number.isFinite,
    )
  ) {
    return false;
  }
  const deltaX = target.x - origin.x;
  const deltaY = target.y - origin.y;
  const distance = Math.hypot(deltaX, deltaY);
  const safeRadius = Math.max(0, targetRadius);
  if (distance > Math.max(0, range) + safeRadius) return false;
  if (distance <= safeRadius) return true;
  const direction = { x: deltaX / distance, y: deltaY / distance };
  const normalizedFacing = normalizeDirection(facing);
  const dot = Math.max(
    -1,
    Math.min(1, normalizedFacing.x * direction.x + normalizedFacing.y * direction.y),
  );
  const targetAllowance = Math.asin(Math.min(1, safeRadius / distance));
  const halfArc = (Math.max(0, fullArcDegrees) * Math.PI) / 360;
  return Math.acos(dot) <= halfArc + targetAllowance + Number.EPSILON;
}

export function hasWalkableAttackLine(
  layout: DungeonLayout,
  origin: Vector2,
  target: Vector2,
): boolean {
  const distance = Math.hypot(target.x - origin.x, target.y - origin.y);
  const steps = Math.max(1, Math.ceil(distance / (layout.tileSize / 4)));
  for (let step = 0; step <= steps; step += 1) {
    const ratio = step / steps;
    const x = origin.x + (target.x - origin.x) * ratio;
    const y = origin.y + (target.y - origin.y) * ratio;
    const tileX = Math.floor(x / layout.tileSize);
    const tileY = Math.floor(y / layout.tileSize);
    if (layout.floorMask[tileY * layout.mapWidth + tileX] !== true) return false;
  }
  return true;
}

export function selectMeleeHits(
  layout: DungeonLayout,
  origin: Vector2,
  facing: Vector2,
  targets: readonly MeleeTarget[],
  alreadyHit: ReadonlySet<string>,
): readonly string[] {
  return Object.freeze(
    targets
      .filter(
        (target) =>
          target.alive &&
          !alreadyHit.has(target.id) &&
          isTargetInsideMeleeSector(origin, facing, target.position, target.radius) &&
          hasWalkableAttackLine(layout, origin, target.position),
      )
      .map((target) => target.id)
      .sort(),
  );
}
