export const LOOT_CONFIG = Object.freeze({
  contractVersion: 1,
  chestCount: 3,
  chestMinimumShards: 2,
  chestMaximumShards: 4,
  chestEnemySeparation: 80,
  forgePreferredSpawnSeparation: 96,
  clearanceRadiusTiles: 1,
  pickupCollectionRadius: 28,
  flaskHealing: 2,
  minimumPlannedShards: 14,
  upgradeCostContractVersion: 1,
});

export const ENEMY_FLASK_PROBABILITY = Object.freeze({
  "bone-stalker": 1 / 8,
  "ash-wisp": 1 / 5,
  "stone-warden": 1 / 3,
});

export const LOOT_GAME_OBJECT_NAMES = Object.freeze({
  CHEST_PREFIX: "treasure-chest:",
  FORGE: "runeforge",
  PICKUP_PREFIX: "loot-pickup:",
  UPGRADE_OVERLAY: "runeforge-overlay",
  UPGRADE_CARD_PREFIX: "runeforge-card:",
  UPGRADE_CLOSE: "runeforge-close",
});
