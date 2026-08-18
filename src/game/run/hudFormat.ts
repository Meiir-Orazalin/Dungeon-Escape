import { formatElapsedTime } from "../objective/timer";
import { getUpgrade } from "../upgrades/catalog";
import type { UpgradeId } from "../upgrades/types";
import type { FloorNumber } from "./types";

export function formatFloorIndicator(floorNumber: FloorNumber): string {
  return `${floorNumber} / 3`;
}

export function formatRunTimers(floorTimeMs: number, runTimeMs: number): string {
  return `FLOOR ${formatElapsedTime(floorTimeMs)}  ·  RUN ${formatElapsedTime(runTimeMs)}`;
}

export function formatGlobalBuildCount(selected: number): string {
  return `${selected} / 6`;
}

export function formatFloorForgeCount(purchases: number): string {
  return purchases >= 2 ? "COMPLETE" : `${purchases} / 2`;
}

export function formatCompactBuild(ids: readonly UpgradeId[]): string {
  return ids.length === 0 ? "NONE" : ids.map((id) => getUpgrade(id).shortName).join(" + ");
}
