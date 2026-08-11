import type { RunOutcome } from "./types";

export function createActiveRunOutcome(): RunOutcome {
  return "active";
}

export function transitionRunOutcome(
  state: RunOutcome,
  event: "escape" | "defeat" | "reset",
): RunOutcome {
  if (event === "reset") return "active";
  if (state !== "active") return state;
  return event === "escape" ? "escaped" : "defeated";
}
