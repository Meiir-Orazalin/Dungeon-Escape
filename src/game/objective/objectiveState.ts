import type { EscapeObjectiveState, ObjectiveAction, ObjectiveTransition } from "./types";

const SEEKING_KEY: EscapeObjectiveState = Object.freeze({ status: "seeking-key" });
const KEY_COLLECTED: EscapeObjectiveState = Object.freeze({ status: "key-collected" });

export function createInitialObjectiveState(): EscapeObjectiveState {
  return SEEKING_KEY;
}

export function objectiveHasKey(state: EscapeObjectiveState): boolean {
  return state.status === "key-collected" || state.status === "completed";
}

export function reduceObjectiveState(
  state: EscapeObjectiveState,
  action: ObjectiveAction,
): ObjectiveTransition {
  if (action.type === "reset") {
    return Object.freeze({ state: SEEKING_KEY, outcome: "reset" });
  }

  if (action.type === "collect-key") {
    if (state.status !== "seeking-key") {
      return Object.freeze({ state, outcome: "ignored" });
    }
    return Object.freeze({ state: KEY_COLLECTED, outcome: "key-collected" });
  }

  if (state.status === "seeking-key") {
    return Object.freeze({ state, outcome: "gate-blocked" });
  }
  if (state.status === "completed") {
    return Object.freeze({ state, outcome: "ignored" });
  }

  const completionTimeMs =
    Number.isFinite(action.elapsedTimeMs) && action.elapsedTimeMs >= 0 ? action.elapsedTimeMs : 0;
  return Object.freeze({
    state: Object.freeze({ status: "completed", completionTimeMs }),
    outcome: "completed",
  });
}
