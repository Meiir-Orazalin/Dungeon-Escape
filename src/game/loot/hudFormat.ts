import { getUpgrade } from "../upgrades/catalog";
import type { UpgradeId } from "../upgrades/types";
import type { ForgeRewardState } from "./rewardState";

export function formatShardProgress(available: number, forge: ForgeRewardState): string {
  return forge.status === "exhausted" ? `${available}` : `${available} / ${forge.cost}`;
}

export function formatChestProgress(opened: number, total: number): string {
  return `${opened} / ${total}`;
}

export function formatUpgradeProgress(selected: number): string {
  return selected >= 2 ? "COMPLETE" : `${selected} / 2`;
}

export function formatSelectedUpgradeNames(ids: readonly UpgradeId[]): string {
  return ids.length === 0 ? "NONE" : ids.map((id) => getUpgrade(id).shortName).join(" + ");
}
