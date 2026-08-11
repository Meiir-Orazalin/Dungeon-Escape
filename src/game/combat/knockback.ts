import { COMBAT_CONFIG, safeDelta } from "./config";
import { directionBetween, normalizeDirection } from "./facing";
import type { KnockbackState, Vector2 } from "./types";

export function createKnockback(
  target: Vector2,
  source: Vector2,
  speed: number = COMBAT_CONFIG.playerKnockbackSpeed,
  durationMs: number = COMBAT_CONFIG.playerKnockbackMs,
  fallback: Vector2 = { x: 1, y: 0 },
): KnockbackState {
  const away = directionBetween(source, target, normalizeDirection(fallback));
  return Object.freeze({
    velocity: Object.freeze({ x: away.x * speed, y: away.y * speed }),
    remainingMs: Math.max(0, Number.isFinite(durationMs) ? durationMs : 0),
  });
}

export function updateKnockback(
  state: KnockbackState | null,
  rawDelta: number,
): KnockbackState | null {
  if (!state) return null;
  const remainingMs = Math.max(0, state.remainingMs - safeDelta(rawDelta));
  return remainingMs > 0 ? Object.freeze({ ...state, remainingMs }) : null;
}
