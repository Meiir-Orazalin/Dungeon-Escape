import type { RunOutcome } from "../combat/types";
import type { ActiveRunActivity } from "../run/types";

export function shouldRequestAutomaticPause(
  outcome: RunOutcome,
  activity: ActiveRunActivity,
  modalKind: string,
): boolean {
  return outcome === "active" && activity === "playing" && modalKind === "none";
}

export function shouldResumeFromFocus(): false {
  return false;
}
