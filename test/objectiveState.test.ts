import { describe, expect, it } from "vitest";

import {
  createInitialObjectiveState,
  reduceObjectiveState,
} from "../src/game/objective/objectiveState";

describe("escape objective state", () => {
  it("starts in seeking-key", () => {
    expect(createInitialObjectiveState()).toEqual({ status: "seeking-key" });
  });

  it("blocks a gate attempt before the key", () => {
    const transition = reduceObjectiveState(createInitialObjectiveState(), {
      type: "attempt-gate",
      elapsedTimeMs: 100,
    });
    expect(transition.outcome).toBe("gate-blocked");
  });

  it("does not mutate progress after a blocked gate attempt", () => {
    const initial = createInitialObjectiveState();
    expect(reduceObjectiveState(initial, { type: "attempt-gate", elapsedTimeMs: 100 }).state).toBe(
      initial,
    );
  });

  it("collects the Runic Key", () => {
    expect(reduceObjectiveState(createInitialObjectiveState(), { type: "collect-key" })).toEqual({
      state: { status: "key-collected" },
      outcome: "key-collected",
    });
  });

  it("treats duplicate key collection as idempotent", () => {
    const collected = reduceObjectiveState(createInitialObjectiveState(), {
      type: "collect-key",
    }).state;
    const duplicate = reduceObjectiveState(collected, { type: "collect-key" });
    expect(duplicate.state).toBe(collected);
    expect(duplicate.outcome).toBe("ignored");
  });

  it("completes after a gate attempt with the key", () => {
    const collected = reduceObjectiveState(createInitialObjectiveState(), {
      type: "collect-key",
    }).state;
    expect(
      reduceObjectiveState(collected, { type: "attempt-gate", elapsedTimeMs: 9_000 }).state,
    ).toEqual({ status: "completed", completionTimeMs: 9_000 });
  });

  it("records the supplied elapsed completion time", () => {
    const collected = reduceObjectiveState(createInitialObjectiveState(), {
      type: "collect-key",
    }).state;
    const completed = reduceObjectiveState(collected, {
      type: "attempt-gate",
      elapsedTimeMs: 12_345,
    });
    expect(completed).toEqual({
      state: { status: "completed", completionTimeMs: 12_345 },
      outcome: "completed",
    });
  });

  it("ignores gate attempts after completion", () => {
    const completed = { status: "completed", completionTimeMs: 5_000 } as const;
    const transition = reduceObjectiveState(completed, {
      type: "attempt-gate",
      elapsedTimeMs: 8_000,
    });
    expect(transition.state).toBe(completed);
    expect(transition.outcome).toBe("ignored");
  });

  it("resets progression to seeking-key", () => {
    const completed = { status: "completed", completionTimeMs: 5_000 } as const;
    expect(reduceObjectiveState(completed, { type: "reset" })).toEqual({
      state: { status: "seeking-key" },
      outcome: "reset",
    });
  });
});
