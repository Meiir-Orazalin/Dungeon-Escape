import type { RoomDiscoveryState } from "../dungeon/discovery";
import type { LootPlan } from "./types";

export type ForgeMarkerState = "dormant" | "ready" | "exhausted";

export interface LootMinimapMarkers {
  readonly chestRoomIds: readonly number[];
  readonly forge: ForgeMarkerState;
}

export function deriveLootMinimapMarkers(
  discovery: RoomDiscoveryState,
  plan: LootPlan,
  openedChestIds: ReadonlySet<string>,
  forgeState: ForgeMarkerState,
): LootMinimapMarkers {
  return Object.freeze({
    chestRoomIds: Object.freeze(
      plan.chests
        .filter(
          (chest) => discovery.discoveredRoomIds.has(chest.roomId) && !openedChestIds.has(chest.id),
        )
        .map((chest) => chest.roomId)
        .sort((left, right) => left - right),
    ),
    forge: forgeState,
  });
}
