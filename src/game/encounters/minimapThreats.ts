import type { RoomDiscoveryState } from "../dungeon/discovery";
import type { EncounterPlan } from "./types";

export function deriveThreatRoomIds(
  discovery: RoomDiscoveryState,
  plan: EncounterPlan,
  aliveEnemyIds: ReadonlySet<string>,
): readonly number[] {
  return Object.freeze(
    plan.enemies
      .filter(
        (enemy) => discovery.discoveredRoomIds.has(enemy.roomId) && aliveEnemyIds.has(enemy.id),
      )
      .map((enemy) => enemy.roomId)
      .sort((left, right) => left - right),
  );
}
