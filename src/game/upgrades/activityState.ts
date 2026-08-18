import type { ActiveRunActivity } from "../run/types";

export type { ActiveRunActivity } from "../run/types";

export function transitionActiveRunActivity(
  current: ActiveRunActivity,
  action: "open-upgrade" | "clear-floor" | "resume",
): ActiveRunActivity {
  if (action === "open-upgrade") return current === "playing" ? "choosing-upgrade" : current;
  if (action === "clear-floor") return current === "playing" ? "floor-cleared" : current;
  return current === "choosing-upgrade" || current === "floor-cleared" ? "playing" : current;
}
