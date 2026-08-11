export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

export type AttackPhase = "ready" | "wind-up" | "active" | "recovery" | "cooldown";

export interface AttackState {
  readonly phase: AttackPhase;
  readonly phaseRemainingMs: number;
  readonly cooldownRemainingMs: number;
  readonly attackId: number;
  readonly hitEnemyIds: ReadonlySet<string>;
}

export type DashState =
  | Readonly<{ status: "ready" }>
  | Readonly<{
      status: "active";
      direction: Vector2;
      activeRemainingMs: number;
      cooldownRemainingMs: number;
    }>
  | Readonly<{ status: "cooldown"; cooldownRemainingMs: number }>;

export type PlayerVitality =
  | Readonly<{
      status: "alive";
      health: number;
      maximumHealth: number;
      invulnerabilityRemainingMs: number;
      hitStunRemainingMs: number;
    }>
  | Readonly<{ status: "defeated"; health: 0; maximumHealth: number }>;

export type DamageOutcome = "accepted" | "ignored" | "defeated";

export interface DamageTransition {
  readonly state: PlayerVitality;
  readonly outcome: DamageOutcome;
}

export interface KnockbackState {
  readonly velocity: Vector2;
  readonly remainingMs: number;
}

export type RunOutcome = "active" | "escaped" | "defeated";
