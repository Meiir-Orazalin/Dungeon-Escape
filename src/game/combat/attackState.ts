import { COMBAT_CONFIG, safeDelta } from "./config";
import type { AttackPhase, AttackState } from "./types";

export interface AttackTiming {
  readonly attackWindUpMs: number;
  readonly attackActiveMs: number;
  readonly attackRecoveryMs: number;
  readonly attackCooldownMs: number;
}

const BASE_ATTACK_TIMING: AttackTiming = Object.freeze({
  attackWindUpMs: COMBAT_CONFIG.attackWindUpMs,
  attackActiveMs: COMBAT_CONFIG.attackActiveMs,
  attackRecoveryMs: COMBAT_CONFIG.attackRecoveryMs,
  attackCooldownMs: COMBAT_CONFIG.attackCooldownMs,
});

export function createReadyAttackState(): AttackState {
  return Object.freeze({
    phase: "ready",
    phaseRemainingMs: 0,
    cooldownRemainingMs: 0,
    attackId: 0,
    hitEnemyIds: new Set<string>(),
  });
}

export function beginAttack(
  state: AttackState,
  blocked: Readonly<{ dashing: boolean; hitStunned: boolean }>,
  timing: AttackTiming = BASE_ATTACK_TIMING,
): AttackState {
  if (state.phase !== "ready" || blocked.dashing || blocked.hitStunned) return state;
  return Object.freeze({
    phase: "wind-up",
    phaseRemainingMs: timing.attackWindUpMs,
    cooldownRemainingMs: timing.attackCooldownMs,
    attackId: state.attackId + 1,
    hitEnemyIds: new Set<string>(),
  });
}

export function registerAttackHits(state: AttackState, ids: readonly string[]): AttackState {
  if (state.phase !== "active" || ids.length === 0) return state;
  return Object.freeze({ ...state, hitEnemyIds: new Set([...state.hitEnemyIds, ...ids]) });
}

export function cancelAttack(state: AttackState): AttackState {
  if (state.phase === "ready") return state;
  return Object.freeze({
    ...state,
    phase: state.cooldownRemainingMs > 0 ? "cooldown" : "ready",
    phaseRemainingMs: 0,
  });
}

export function updateAttackState(
  state: AttackState,
  rawDelta: number,
  timing: AttackTiming = BASE_ATTACK_TIMING,
): AttackState {
  let delta = safeDelta(rawDelta);
  if (delta === 0 || state.phase === "ready") return state;
  let phase: AttackPhase = state.phase;
  let phaseRemainingMs = state.phaseRemainingMs;
  const cooldownRemainingMs = Math.max(0, state.cooldownRemainingMs - delta);
  while (delta >= phaseRemainingMs && phase !== "ready" && phase !== "cooldown") {
    delta -= phaseRemainingMs;
    if (phase === "wind-up") {
      phase = "active";
      phaseRemainingMs = timing.attackActiveMs;
    } else if (phase === "active") {
      phase = "recovery";
      phaseRemainingMs = timing.attackRecoveryMs;
    } else {
      phase = cooldownRemainingMs > 0 ? "cooldown" : "ready";
      phaseRemainingMs = 0;
    }
  }
  if (phase !== "ready" && phase !== "cooldown") phaseRemainingMs -= delta;
  if (phase === "cooldown" && cooldownRemainingMs <= 0) phase = "ready";
  return Object.freeze({ ...state, phase, phaseRemainingMs, cooldownRemainingMs });
}
