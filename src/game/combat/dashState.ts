import { COMBAT_CONFIG, safeDelta } from "./config";
import { normalizeDirection } from "./facing";
import type { DashState, Vector2 } from "./types";

export function createReadyDashState(): DashState {
  return Object.freeze({ status: "ready" });
}

export function beginDash(
  state: DashState,
  movementDirection: Vector2,
  facing: Vector2,
  blocked: boolean,
): DashState {
  if (state.status !== "ready" || blocked) return state;
  const direction = normalizeDirection(movementDirection, facing);
  return Object.freeze({
    status: "active",
    direction,
    activeRemainingMs: COMBAT_CONFIG.dashDurationMs,
    cooldownRemainingMs: COMBAT_CONFIG.dashCooldownMs,
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
