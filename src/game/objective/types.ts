import type { WorldPoint } from "../dungeon/types";

export interface EscapeObjectivePlan {
  readonly fingerprint: string;
  readonly keyRoomId: number;
  readonly keyPosition: WorldPoint;
  readonly gateRoomId: number;
  readonly gatePosition: WorldPoint;
}

export type EscapeObjectiveState =
  | Readonly<{ status: "seeking-key" }>
  | Readonly<{ status: "key-collected" }>
  | Readonly<{ status: "completed"; completionTimeMs: number }>;

export type ObjectiveAction =
  | Readonly<{ type: "collect-key" }>
  | Readonly<{ type: "attempt-gate"; elapsedTimeMs: number }>
  | Readonly<{ type: "reset" }>;

export type ObjectiveOutcome =
  "none" | "key-collected" | "gate-blocked" | "completed" | "ignored" | "reset";

export interface ObjectiveTransition {
  readonly state: EscapeObjectiveState;
  readonly outcome: ObjectiveOutcome;
}

export type ObjectiveTargetId = "key" | "gate";

export interface ObjectiveValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
