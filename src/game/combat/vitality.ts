import { COMBAT_CONFIG, safeDelta } from "./config";
import type { DamageTransition, PlayerVitality } from "./types";

export interface HealingTransition {
  readonly state: PlayerVitality;
  readonly restoredHealth: number;
  readonly consumed: boolean;
}

export function createInitialVitality(
  maximumHealth = COMBAT_CONFIG.playerMaximumHealth,
): PlayerVitality {
  if (!Number.isInteger(maximumHealth) || maximumHealth <= 0) {
    throw new RangeError("Maximum health must be a positive integer.");
  }
  return Object.freeze({
    status: "alive",
    health: maximumHealth,
    maximumHealth,
    invulnerabilityRemainingMs: 0,
    hitStunRemainingMs: 0,
  });
}

export function applyPlayerDamage(
  state: PlayerVitality,
  damage: number,
  dashInvulnerable: boolean,
  postHitInvulnerabilityMs: number = COMBAT_CONFIG.postDamageInvulnerabilityMs,
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
      invulnerabilityRemainingMs: postHitInvulnerabilityMs,
      hitStunRemainingMs: COMBAT_CONFIG.hitStunMs,
    }),
    outcome: "accepted",
  });
}

export function healPlayer(state: PlayerVitality, amount: number): HealingTransition {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError("Healing amount must be finite and positive.");
  }
  if (state.status === "defeated" || state.health >= state.maximumHealth) {
    return Object.freeze({ state, restoredHealth: 0, consumed: false });
  }
  const health = Math.min(state.maximumHealth, state.health + amount);
  return Object.freeze({
    state: Object.freeze({ ...state, health }),
    restoredHealth: health - state.health,
    consumed: health > state.health,
  });
}

export function increaseMaximumHealth(
  state: PlayerVitality,
  maximumHealth: number,
  restoreAmount: number,
): HealingTransition {
  if (!Number.isInteger(maximumHealth) || maximumHealth <= 0) {
    throw new RangeError("Maximum health must be a positive integer.");
  }
  if (!Number.isFinite(restoreAmount) || restoreAmount < 0) {
    throw new RangeError("Maximum-health restoration must be finite and non-negative.");
  }
  if (state.status === "defeated") {
    return Object.freeze({ state, restoredHealth: 0, consumed: false });
  }
  const current = Math.min(state.health, maximumHealth);
  const health = Math.min(maximumHealth, current + restoreAmount);
  return Object.freeze({
    state: Object.freeze({ ...state, health, maximumHealth }),
    restoredHealth: health - state.health,
    consumed: true,
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
