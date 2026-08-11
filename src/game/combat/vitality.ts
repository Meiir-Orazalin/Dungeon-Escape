import { COMBAT_CONFIG, safeDelta } from "./config";
import type { DamageTransition, PlayerVitality } from "./types";

export function createInitialVitality(): PlayerVitality {
  return Object.freeze({
    status: "alive",
    health: COMBAT_CONFIG.playerMaximumHealth,
    maximumHealth: COMBAT_CONFIG.playerMaximumHealth,
    invulnerabilityRemainingMs: 0,
    hitStunRemainingMs: 0,
  });
}

export function applyPlayerDamage(
  state: PlayerVitality,
  damage: number,
  dashInvulnerable: boolean,
): DamageTransition {
  if (
    state.status === "defeated" ||
    dashInvulnerable ||
    state.invulnerabilityRemainingMs > 0 ||
    !Number.isInteger(damage) ||
    damage <= 0
  ) {
    return Object.freeze({ state, outcome: "ignored" });
  }
  const health = Math.max(0, state.health - damage);
  if (health === 0) {
    return Object.freeze({
      state: Object.freeze({ status: "defeated", health: 0, maximumHealth: state.maximumHealth }),
      outcome: "defeated",
    });
  }
  return Object.freeze({
    state: Object.freeze({
      ...state,
      health,
      invulnerabilityRemainingMs: COMBAT_CONFIG.postDamageInvulnerabilityMs,
      hitStunRemainingMs: COMBAT_CONFIG.hitStunMs,
    }),
    outcome: "accepted",
  });
}

export function updateVitality(state: PlayerVitality, rawDelta: number): PlayerVitality {
  if (state.status === "defeated") return state;
  const delta = safeDelta(rawDelta);
  if (delta === 0) return state;
  return Object.freeze({
    ...state,
    invulnerabilityRemainingMs: Math.max(0, state.invulnerabilityRemainingMs - delta),
    hitStunRemainingMs: Math.max(0, state.hitStunRemainingMs - delta),
  });
}

export function isPlayerInvulnerable(state: PlayerVitality, dashActive: boolean): boolean {
  return dashActive || (state.status === "alive" && state.invulnerabilityRemainingMs > 0);
}
