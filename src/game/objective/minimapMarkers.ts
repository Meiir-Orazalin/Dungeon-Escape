import type { RoomDiscoveryState } from "../dungeon/discovery";
import type { EscapeObjectivePlan, EscapeObjectiveState } from "./types";

export interface ObjectiveMarkerState {
  readonly key: "hidden" | "visible";
  readonly gate: "hidden" | "sealed" | "ready";
}

export function deriveObjectiveMarkerState(
  discovery: RoomDiscoveryState,
  plan: EscapeObjectivePlan,
  state: EscapeObjectiveState,
): ObjectiveMarkerState {
  const keyRoomDiscovered = discovery.discoveredRoomIds.has(plan.keyRoomId);
  const gateRoomDiscovered = discovery.discoveredRoomIds.has(plan.gateRoomId);

  return Object.freeze({
    key: keyRoomDiscovered && state.status === "seeking-key" ? "visible" : "hidden",
    gate: gateRoomDiscovered ? (state.status === "seeking-key" ? "sealed" : "ready") : "hidden",
  });
}
