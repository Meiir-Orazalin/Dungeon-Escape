import type { Vector2 } from "../combat/types";

export type EnemyReadableState =
  | "dormant"
  | "idle"
  | "chase"
  | "approach"
  | "retreat"
  | "hold"
  | "telegraph"
  | "wind-up"
  | "charge"
  | "recover"
  | "return"
  | "dead";

export interface EnemyDecision {
  readonly state: EnemyReadableState;
  readonly velocity: Vector2;
}

export interface EnemyDecisionInput {
  readonly discovered: boolean;
  readonly playerInHomeRoom: boolean;
  readonly dead: boolean;
  readonly position: Vector2;
  readonly spawnPosition: Vector2;
  readonly playerPosition: Vector2;
}

export interface AshWispState {
  readonly mode: EnemyReadableState;
  readonly shotCooldownRemainingMs: number;
  readonly telegraphRemainingMs: number;
  readonly lockedDirection: Vector2;
}

export interface AshWispTransition {
  readonly state: AshWispState;
  readonly velocity: Vector2;
  readonly fireProjectile: boolean;
  readonly projectileDirection: Vector2;
}

export interface StoneWardenState {
  readonly mode: EnemyReadableState;
  readonly remainingMs: number;
  readonly lockedDirection: Vector2;
}

export interface StoneWardenSignals {
  readonly wallImpact?: boolean;
  readonly swordInterrupted?: boolean;
}

export interface StoneWardenTransition {
  readonly state: StoneWardenState;
  readonly velocity: Vector2;
}
