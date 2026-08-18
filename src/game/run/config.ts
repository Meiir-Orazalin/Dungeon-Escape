export const RUN_CONFIG = Object.freeze({
  contractVersion: 1,
  floorSeedContractVersion: 1,
  floorCount: 3,
  transitionHealing: 1,
  maximumPurchasesPerFloor: 2,
  maximumPurchasesPerRun: 6,
  firstForgeCost: 6,
  secondForgeCost: 8,
});

export const FLOOR_NUMBERS = Object.freeze([1, 2, 3] as const);
