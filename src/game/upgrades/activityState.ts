export type ActiveRunActivity = "playing" | "choosing-upgrade";

export function transitionActiveRunActivity(
  current: ActiveRunActivity,
  action: "open-upgrade" | "resume",
): ActiveRunActivity {
  if (action === "open-upgrade") return current === "playing" ? "choosing-upgrade" : current;
  return current === "choosing-upgrade" ? "playing" : current;
}
