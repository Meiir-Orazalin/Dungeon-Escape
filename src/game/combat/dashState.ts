import { COMBAT_CONFIG, safeDelta } from "./config";
import { normalizeDirection } from "./facing";
import type { DashState, Vector2 } from "./types";

export interface DashTiming {
  readonly dashDurationMs: number;
  readonly dashCooldownMs: number;
}

const BASE_DASH_TIMING: DashTiming = Object.freeze({
  dashDurationMs: COMBAT_CONFIG.dashDurationMs,
  dashCooldownMs: COMBAT_CONFIG.dashCooldownMs,
});

export function createReadyDashState(): DashState {
  return Object.freeze({ status: "ready" });
}

export function beginDash(
  state: DashState,
  movementDirection: Vector2,
  facing: Vector2,
  blocked: boolean,
  timing: DashTiming = BASE_DASH_TIMING,
): DashState {
  if (state.status !== "ready" || blocked) return state;
  const direction = normalizeDirection(movementDirection, facing);
  return Object.freeze({
    status: "active",
    direction,
    activeRemainingMs: timing.dashDurationMs,
    cooldownRemainingMs: timing.dashCooldownMs,
  });
}

export function clampDashCooldown(state: DashState, maximumCooldownMs: number): DashState {
  if (!Number.isFinite(maximumCooldownMs) || maximumCooldownMs <= 0) {
    throw new RangeError("Dash cooldown limit must be finite and positive.");
  }
  if (state.status === "ready") return state;
  if (state.status === "active") {
    return Object.freeze({
      ...state,
      cooldownRemainingMs: Math.min(state.cooldownRemainingMs, maximumCooldownMs),
    });
  }
  return Object.freeze({
    status: "cooldown",
    cooldownRemainingMs: Math.min(state.cooldownRemainingMs, maximumCooldownMs),
  });
}

export function cancelDash(state: DashState): DashState {
  if (state.status !== "active") return state;
  return Object.freeze({ status: "cooldown", cooldownRemainingMs: state.cooldownRemainingMs });
}

export function updateDashState(state: DashState, rawDelta: number): DashState {
  const delta = safeDelta(rawDelta);
  if (delta === 0 || state.status === "ready") return state;
  if (state.status === "active") {
    const activeRemainingMs = Math.max(0, state.activeRemainingMs - delta);
    const cooldownRemainingMs = Math.max(0, state.cooldownRemainingMs - delta);
    return activeRemainingMs > 0
      ? Object.freeze({ ...state, activeRemainingMs, cooldownRemainingMs })
      : cooldownRemainingMs > 0
        ? Object.freeze({ status: "cooldown", cooldownRemainingMs })
        : createReadyDashState();
  }
  const cooldownRemainingMs = Math.max(0, state.cooldownRemainingMs - delta);
  return cooldownRemainingMs > 0
    ? Object.freeze({ status: "cooldown", cooldownRemainingMs })
    : createReadyDashState();
}
