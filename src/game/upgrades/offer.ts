import { SeededRandom } from "../dungeon/random";
import { hashSeed } from "../dungeon/seed";
import { UPGRADE_CATALOG_VERSION, UPGRADE_IDS, stableUpgradeIds } from "./catalog";
import type { UpgradeId, UpgradeOffer } from "./types";

export function createUpgradeOfferFingerprint(
  lootFingerprint: string,
  floorNumber: 1 | 2 | 3,
  offerIndex: number,
  selectedIds: readonly UpgradeId[],
  offeredIds: readonly UpgradeId[],
): string {
  const contract = [
    `v${UPGRADE_CATALOG_VERSION}`,
    lootFingerprint,
    floorNumber,
    offerIndex,
    stableUpgradeIds(selectedIds).join(","),
    offeredIds.join(","),
  ].join("|");
  return `uo-${hashSeed(contract).toString(16).padStart(8, "0")}`;
}

export function createUpgradeOffer(
  lootFingerprint: string,
  floorNumber: 1 | 2 | 3,
  offerIndex: number,
  selectedIds: readonly UpgradeId[],
): UpgradeOffer {
  if (!/^lt-[0-9a-f]{8}$/.test(lootFingerprint)) {
    throw new RangeError("Upgrade offers require a valid loot fingerprint.");
  }
  if (![1, 2, 3].includes(floorNumber)) {
    throw new RangeError("Upgrade offers require floor 1, 2, or 3.");
  }
  if (!Number.isInteger(offerIndex) || offerIndex < 0 || offerIndex > 1) {
    throw new RangeError("Phase 5 upgrade offer index must be zero or one.");
  }
  if (new Set(selectedIds).size !== selectedIds.length || selectedIds.length > 5) {
    throw new RangeError("Upgrade offer history must contain at most five unique selections.");
  }
  const selected = new Set(selectedIds);
  const remaining = UPGRADE_IDS.filter((id) => !selected.has(id));
  const random = new SeededRandom(
    hashSeed(
      `upgrade-offer-v${UPGRADE_CATALOG_VERSION}:${lootFingerprint}:${floorNumber}:${offerIndex}:${stableUpgradeIds(selectedIds).join(",")}`,
    ),
  );
  const upgradeIds = Object.freeze(random.shuffle(remaining).slice(0, 3));
  if (upgradeIds.length !== 3 || new Set(upgradeIds).size !== 3) {
    throw new RangeError("Upgrade offer generation requires three distinct unselected upgrades.");
  }
  return Object.freeze({
    floorNumber,
    index: offerIndex,
    fingerprint: createUpgradeOfferFingerprint(
      lootFingerprint,
      floorNumber,
      offerIndex,
      selectedIds,
      upgradeIds,
    ),
    upgradeIds,
  });
}
