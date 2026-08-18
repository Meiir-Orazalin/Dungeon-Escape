import { safeDelta } from "../combat/config";
import { DEFAULT_FACING, directionBetween, normalizeDirection } from "../combat/facing";
import type { Vector2 } from "../combat/types";
import {
  ASH_WISP_CONFIG,
  BONE_STALKER_CONFIG,
  ENEMY_RETURN_DISTANCE,
  STONE_WARDEN_CONFIG,
} from "./enemyConfig";
import type {
  AshWispState,
  AshWispTransition,
  EnemyDecision,
  EnemyDecisionInput,
  StoneWardenSignals,
  StoneWardenState,
  StoneWardenTransition,
} from "./types";
import type { EffectiveEnemyStats } from "../run/types";

const ZERO: Vector2 = Object.freeze({ x: 0, y: 0 });

function distance(left: Vector2, right: Vector2): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function velocityToward(from: Vector2, to: Vector2, speed: number): Vector2 {
  const direction = directionBetween(from, to);
  return Object.freeze({ x: direction.x * speed, y: direction.y * speed });
}

function returnDecision(input: EnemyDecisionInput, speed: number): EnemyDecision {
  if (distance(input.position, input.spawnPosition) <= ENEMY_RETURN_DISTANCE) {
    return Object.freeze({ state: "idle", velocity: ZERO });
  }
  return Object.freeze({
    state: "return",
    velocity: velocityToward(input.position, input.spawnPosition, speed),
  });
}

export function decideBoneStalker(
  input: EnemyDecisionInput,
  effective?: EffectiveEnemyStats,
): EnemyDecision {
  const movementSpeed = effective?.movementSpeed ?? BONE_STALKER_CONFIG.movementSpeed;
  if (input.dead) return Object.freeze({ state: "dead", velocity: ZERO });
  if (!input.discovered) return Object.freeze({ state: "dormant", velocity: ZERO });
  if (!input.playerInHomeRoom) return returnDecision(input, movementSpeed);
  const velocity =
    distance(input.position, input.playerPosition) <= BONE_STALKER_CONFIG.closeDistance
      ? ZERO
      : velocityToward(input.position, input.playerPosition, movementSpeed);
  return Object.freeze({ state: "chase", velocity });
}

export function createAshWispState(effective?: EffectiveEnemyStats): AshWispState {
  return Object.freeze({
    mode: "dormant",
    shotCooldownRemainingMs:
      effective?.wispInitialShotDelayMs ?? ASH_WISP_CONFIG.initialShotDelayMs,
    telegraphRemainingMs: 0,
    lockedDirection: DEFAULT_FACING,
  });
}

export function updateAshWisp(
  state: AshWispState,
  input: EnemyDecisionInput,
  rawDelta: number,
  effective?: EffectiveEnemyStats,
): AshWispTransition {
  const delta = safeDelta(rawDelta);
  const movementSpeed = effective?.movementSpeed ?? ASH_WISP_CONFIG.movementSpeed;
  const shotCooldownMs = effective?.wispShotCooldownMs ?? ASH_WISP_CONFIG.shotCooldownMs;
  const telegraphMs = effective?.wispTelegraphMs ?? ASH_WISP_CONFIG.shotTelegraphMs;
  if (input.dead) {
    return Object.freeze({
      state: Object.freeze({ ...state, mode: "dead", telegraphRemainingMs: 0 }),
      velocity: ZERO,
      fireProjectile: false,
      projectileDirection: state.lockedDirection,
    });
  }
  if (!input.discovered) {
    return Object.freeze({
      state: Object.freeze({ ...state, mode: "dormant", telegraphRemainingMs: 0 }),
      velocity: ZERO,
      fireProjectile: false,
      projectileDirection: state.lockedDirection,
    });
  }
  if (!input.playerInHomeRoom) {
    const decision = returnDecision(input, movementSpeed);
    return Object.freeze({
      state: Object.freeze({ ...state, mode: decision.state, telegraphRemainingMs: 0 }),
      velocity: decision.velocity,
      fireProjectile: false,
      projectileDirection: state.lockedDirection,
    });
  }
  if (state.mode === "telegraph") {
    const remaining = Math.max(0, state.telegraphRemainingMs - delta);
    if (remaining > 0) {
      return Object.freeze({
        state: Object.freeze({ ...state, telegraphRemainingMs: remaining }),
        velocity: ZERO,
        fireProjectile: false,
        projectileDirection: state.lockedDirection,
      });
    }
    return Object.freeze({
      state: Object.freeze({
        ...state,
        mode: "hold",
        telegraphRemainingMs: 0,
        shotCooldownRemainingMs: shotCooldownMs,
      }),
      velocity: ZERO,
      fireProjectile: true,
      projectileDirection: state.lockedDirection,
    });
  }

  const shotCooldownRemainingMs = Math.max(0, state.shotCooldownRemainingMs - delta);
  if (shotCooldownRemainingMs === 0) {
    const lockedDirection = directionBetween(input.position, input.playerPosition, DEFAULT_FACING);
    return Object.freeze({
      state: Object.freeze({
        mode: "telegraph",
        shotCooldownRemainingMs: 0,
        telegraphRemainingMs: telegraphMs,
        lockedDirection,
      }),
      velocity: ZERO,
      fireProjectile: false,
      projectileDirection: lockedDirection,
    });
  }

  const playerDistance = distance(input.position, input.playerPosition);
  const direction = directionBetween(input.position, input.playerPosition);
  const mode =
    playerDistance < ASH_WISP_CONFIG.preferredMinimumDistance
      ? "retreat"
      : playerDistance > ASH_WISP_CONFIG.preferredMaximumDistance
        ? "approach"
        : "hold";
  const sign = mode === "retreat" ? -1 : mode === "approach" ? 1 : 0;
  return Object.freeze({
    state: Object.freeze({ ...state, mode, shotCooldownRemainingMs }),
    velocity: Object.freeze({
      x: direction.x * movementSpeed * sign,
      y: direction.y * movementSpeed * sign,
    }),
    fireProjectile: false,
    projectileDirection: state.lockedDirection,
  });
}

export function createStoneWardenState(): StoneWardenState {
  return Object.freeze({ mode: "dormant", remainingMs: 0, lockedDirection: DEFAULT_FACING });
}

export function updateStoneWarden(
  state: StoneWardenState,
  input: EnemyDecisionInput,
  rawDelta: number,
  signals: StoneWardenSignals = {},
  effective?: EffectiveEnemyStats,
): StoneWardenTransition {
  const delta = safeDelta(rawDelta);
  const movementSpeed = effective?.movementSpeed ?? STONE_WARDEN_CONFIG.movementSpeed;
  const recoveryMs = effective?.wardenRecoveryMs ?? STONE_WARDEN_CONFIG.recoveryMs;
  const windUpMs = effective?.wardenWindUpMs ?? STONE_WARDEN_CONFIG.chargeWindUpMs;
  const chargeSpeed = effective?.wardenChargeSpeed ?? STONE_WARDEN_CONFIG.chargeSpeed;
  if (input.dead) {
    return Object.freeze({
      state: Object.freeze({ ...state, mode: "dead", remainingMs: 0 }),
      velocity: ZERO,
    });
  }
  if (!input.discovered) {
    return Object.freeze({
      state: Object.freeze({ ...state, mode: "dormant", remainingMs: 0 }),
      velocity: ZERO,
    });
  }
  if (!input.playerInHomeRoom) {
    const decision = returnDecision(input, movementSpeed);
    return Object.freeze({
      state: Object.freeze({ ...state, mode: decision.state, remainingMs: 0 }),
      velocity: decision.velocity,
    });
  }
  if (signals.wallImpact || signals.swordInterrupted) {
    return Object.freeze({
      state: Object.freeze({
        ...state,
        mode: "recover",
        remainingMs: recoveryMs,
      }),
      velocity: ZERO,
    });
  }
  if (state.mode === "wind-up") {
    const remainingMs = Math.max(0, state.remainingMs - delta);
    if (remainingMs > 0) {
      return Object.freeze({ state: Object.freeze({ ...state, remainingMs }), velocity: ZERO });
    }
    return Object.freeze({
      state: Object.freeze({
        ...state,
        mode: "charge",
        remainingMs: STONE_WARDEN_CONFIG.chargeDurationMs,
      }),
      velocity: Object.freeze({
        x: state.lockedDirection.x * chargeSpeed,
        y: state.lockedDirection.y * chargeSpeed,
      }),
    });
  }
  if (state.mode === "charge") {
    const remainingMs = Math.max(0, state.remainingMs - delta);
    if (remainingMs === 0) {
      return Object.freeze({
        state: Object.freeze({
          ...state,
          mode: "recover",
          remainingMs: recoveryMs,
        }),
        velocity: ZERO,
      });
    }
    return Object.freeze({
      state: Object.freeze({ ...state, remainingMs }),
      velocity: Object.freeze({
        x: state.lockedDirection.x * chargeSpeed,
        y: state.lockedDirection.y * chargeSpeed,
      }),
    });
  }
  if (state.mode === "recover") {
    const remainingMs = Math.max(0, state.remainingMs - delta);
    return Object.freeze({
      state: Object.freeze({
        ...state,
        mode: remainingMs > 0 ? "recover" : "approach",
        remainingMs,
      }),
      velocity: ZERO,
    });
  }

  const playerDistance = distance(input.position, input.playerPosition);
  if (playerDistance <= STONE_WARDEN_CONFIG.chargeTriggerRange) {
    const lockedDirection = directionBetween(input.position, input.playerPosition, DEFAULT_FACING);
    return Object.freeze({
      state: Object.freeze({
        mode: "wind-up",
        remainingMs: windUpMs,
        lockedDirection,
      }),
      velocity: ZERO,
    });
  }
  return Object.freeze({
    state: Object.freeze({ ...state, mode: "approach", remainingMs: 0 }),
    velocity: velocityToward(input.position, input.playerPosition, movementSpeed),
  });
}

export function createProjectileDirection(from: Vector2, to: Vector2): Vector2 {
  return directionBetween(from, to, DEFAULT_FACING);
}

export function updateProjectileLifetime(remainingMs: number, rawDelta: number): number {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
  return Math.max(0, remainingMs - safeDelta(rawDelta));
}

export function stableDirection(direction: Vector2): Vector2 {
  return normalizeDirection(direction, DEFAULT_FACING);
}
