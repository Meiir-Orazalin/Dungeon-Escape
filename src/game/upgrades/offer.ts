import { SeededRandom } from "../dungeon/random";
import { hashSeed } from "../dungeon/seed";
import { UPGRADE_CATALOG_VERSION, UPGRADE_IDS, stableUpgradeIds } from "./catalog";
import type { UpgradeId, UpgradeOffer } from "./types";

export function createUpgradeOfferFingerprint(
  lootFingerprint: string,
  offerIndex: number,
  selectedIds: readonly UpgradeId[],
  offeredIds: readonly UpgradeId[],
): string {
  const contract = [
    `v${UPGRADE_CATALOG_VERSION}`,
    lootFingerprint,
    offerIndex,
    stableUpgradeIds(selectedIds).join(","),
    offeredIds.join(","),
  ].join("|");
  return `uo-${hashSeed(contract).toString(16).padStart(8, "0")}`;
}

export function createUpgradeOffer(
  lootFingerprint: string,
  offerIndex: number,
  selectedIds: readonly UpgradeId[],
): UpgradeOffer {
  if (!/^lt-[0-9a-f]{8}$/.test(lootFingerprint)) {
    throw new RangeError("Upgrade offers require a valid loot fingerprint.");
  }
  if (!Number.isInteger(offerIndex) || offerIndex < 0 || offerIndex > 1) {
    throw new RangeError("Phase 5 upgrade offer index must be zero or one.");
  }
  if (new Set(selectedIds).size !== selectedIds.length || selectedIds.length !== offerIndex) {
    throw new RangeError(
      "Upgrade offer history must contain one unique selection per prior offer.",
    );
  }
  const selected = new Set(selectedIds);
  const remaining = UPGRADE_IDS.filter((id) => !selected.has(id));
  const random = new SeededRandom(
    hashSeed(
      `upgrade-offer-v${UPGRADE_CATALOG_VERSION}:${lootFingerprint}:${offerIndex}:${stableUpgradeIds(selectedIds).join(",")}`,
    ),
  );
  const upgradeIds = Object.freeze(random.shuffle(remaining).slice(0, 3));
  if (upgradeIds.length !== 3 || new Set(upgradeIds).size !== 3) {
    throw new RangeError("Upgrade offer generation requires three distinct unselected upgrades.");
  }
  return Object.freeze({
    index: offerIndex,
    fingerprint: createUpgradeOfferFingerprint(
      lootFingerprint,
      offerIndex,
      selectedIds,
      upgradeIds,
    ),
    upgradeIds,
  });
}
