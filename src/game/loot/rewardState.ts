import { isUpgradeId, stableUpgradeIds } from "../upgrades/catalog";
import type { UpgradeId, UpgradeOffer } from "../upgrades/types";

export const FORGE_COSTS = Object.freeze([6, 8] as const);
export const MAXIMUM_FLOOR_UPGRADES = 2;
export const MAXIMUM_RUN_UPGRADES = 6;

export type ForgeRewardState =
  | Readonly<{ status: "dormant" | "ready"; cost: number }>
  | Readonly<{ status: "choosing"; cost: number; offer: UpgradeOffer }>
  | Readonly<{ status: "exhausted"; cost: null }>;

export interface RunRewardState {
  readonly availableShards: number;
  readonly totalCollectedShards: number;
  readonly openedChestIds: ReadonlySet<string>;
  readonly collectedPickupIds: ReadonlySet<string>;
  readonly flasksConsumed: number;
  readonly selectedUpgradeIds: readonly UpgradeId[];
  readonly forgePurchasesThisFloor: number;
  readonly forge: ForgeRewardState;
}

export interface InitialRewardCarry {
  readonly availableShards: number;
  readonly totalCollectedShards: number;
  readonly selectedUpgradeIds: readonly UpgradeId[];
}

export interface RewardTransition {
  readonly state: RunRewardState;
  readonly outcome: "accepted" | "duplicate" | "ignored" | "opened" | "closed" | "selected";
}

function nextForgeStatus(availableShards: number, floorPurchaseCount: number): ForgeRewardState {
  if (floorPurchaseCount >= MAXIMUM_FLOOR_UPGRADES)
    return Object.freeze({ status: "exhausted", cost: null });
  const cost = FORGE_COSTS[floorPurchaseCount] as number;
  return Object.freeze({ status: availableShards >= cost ? "ready" : "dormant", cost });
}

export function createInitialRewardState(carry?: InitialRewardCarry): RunRewardState {
  const availableShards = carry?.availableShards ?? 0;
  const totalCollectedShards = carry?.totalCollectedShards ?? 0;
  const selectedUpgradeIds = carry?.selectedUpgradeIds ?? [];
  if (
    !Number.isInteger(availableShards) ||
    availableShards < 0 ||
    !Number.isInteger(totalCollectedShards) ||
    totalCollectedShards < availableShards
  ) {
    throw new RangeError("Initial reward carry requires coherent non-negative shard values.");
  }
  if (
    selectedUpgradeIds.length > MAXIMUM_RUN_UPGRADES ||
    new Set(selectedUpgradeIds).size !== selectedUpgradeIds.length ||
    !selectedUpgradeIds.every(isUpgradeId)
  ) {
    throw new RangeError("Initial reward carry requires up to six unique known upgrades.");
  }
  return Object.freeze({
    availableShards,
    totalCollectedShards,
    openedChestIds: new Set<string>(),
    collectedPickupIds: new Set<string>(),
    flasksConsumed: 0,
    selectedUpgradeIds: stableUpgradeIds(selectedUpgradeIds),
    forgePurchasesThisFloor: 0,
    forge: nextForgeStatus(availableShards, 0),
  });
}

export function collectShardPickup(
  state: RunRewardState,
  pickupId: string,
  amount: number,
): RewardTransition {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new RangeError("Runic Shard pickup amount must be a positive integer.");
  }
  if (!pickupId) throw new RangeError("Runic Shard pickup ID must be non-empty.");
  if (state.collectedPickupIds.has(pickupId)) return Object.freeze({ state, outcome: "duplicate" });
  const availableShards = state.availableShards + amount;
  const next = Object.freeze({
    ...state,
    availableShards,
    totalCollectedShards: state.totalCollectedShards + amount,
    collectedPickupIds: new Set([...state.collectedPickupIds, pickupId]),
    forge:
      state.forge.status === "choosing"
        ? state.forge
        : nextForgeStatus(availableShards, state.forgePurchasesThisFloor),
  });
  return Object.freeze({ state: next, outcome: "accepted" });
}

export function openRewardChest(state: RunRewardState, chestId: string): RewardTransition {
  if (!chestId) throw new RangeError("Treasure Chest ID must be non-empty.");
  if (state.openedChestIds.has(chestId)) return Object.freeze({ state, outcome: "duplicate" });
  return Object.freeze({
    state: Object.freeze({
      ...state,
      openedChestIds: new Set([...state.openedChestIds, chestId]),
    }),
    outcome: "accepted",
  });
}

export function recordFlaskConsumption(state: RunRewardState, pickupId: string): RewardTransition {
  if (!pickupId) throw new RangeError("Vitality Flask pickup ID must be non-empty.");
  if (state.collectedPickupIds.has(pickupId)) return Object.freeze({ state, outcome: "duplicate" });
  return Object.freeze({
    state: Object.freeze({
      ...state,
      collectedPickupIds: new Set([...state.collectedPickupIds, pickupId]),
      flasksConsumed: state.flasksConsumed + 1,
    }),
    outcome: "accepted",
  });
}

export function openForgeOffer(state: RunRewardState, offer: UpgradeOffer): RewardTransition {
  if (state.forge.status !== "ready" || offer.index !== state.forgePurchasesThisFloor) {
    return Object.freeze({ state, outcome: "ignored" });
  }
  return Object.freeze({
    state: Object.freeze({
      ...state,
      forge: Object.freeze({ status: "choosing", cost: state.forge.cost, offer }),
    }),
    outcome: "opened",
  });
}

export function closeForgeOffer(state: RunRewardState): RewardTransition {
  if (state.forge.status !== "choosing") return Object.freeze({ state, outcome: "ignored" });
  return Object.freeze({
    state: Object.freeze({
      ...state,
      forge: nextForgeStatus(state.availableShards, state.forgePurchasesThisFloor),
    }),
    outcome: "closed",
  });
}

export function selectForgeUpgrade(state: RunRewardState, rawUpgradeId: string): RewardTransition {
  if (state.forge.status !== "choosing") return Object.freeze({ state, outcome: "ignored" });
  if (!isUpgradeId(rawUpgradeId)) throw new RangeError(`Unknown upgrade ID: ${rawUpgradeId}.`);
  if (!state.forge.offer.upgradeIds.includes(rawUpgradeId)) {
    throw new RangeError(`Upgrade ${rawUpgradeId} is not in the current offer.`);
  }
  if (state.selectedUpgradeIds.includes(rawUpgradeId)) {
    throw new RangeError(`Upgrade ${rawUpgradeId} was already selected.`);
  }
  if (state.selectedUpgradeIds.length >= MAXIMUM_RUN_UPGRADES) {
    throw new RangeError("The run already contains the maximum six upgrades.");
  }
  if (state.availableShards < state.forge.cost) {
    return Object.freeze({ state, outcome: "ignored" });
  }
  const selectedUpgradeIds = stableUpgradeIds([...state.selectedUpgradeIds, rawUpgradeId]);
  const availableShards = state.availableShards - state.forge.cost;
  const forgePurchasesThisFloor = state.forgePurchasesThisFloor + 1;
  return Object.freeze({
    state: Object.freeze({
      ...state,
      availableShards,
      selectedUpgradeIds,
      forgePurchasesThisFloor,
      forge: nextForgeStatus(availableShards, forgePurchasesThisFloor),
    }),
    outcome: "selected",
  });
}
