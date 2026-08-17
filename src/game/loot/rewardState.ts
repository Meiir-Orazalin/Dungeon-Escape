import { isUpgradeId, stableUpgradeIds } from "../upgrades/catalog";
import type { UpgradeId, UpgradeOffer } from "../upgrades/types";

export const FORGE_COSTS = Object.freeze([6, 8] as const);
export const MAXIMUM_RUN_UPGRADES = 2;

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
  readonly forge: ForgeRewardState;
}

export interface RewardTransition {
  readonly state: RunRewardState;
  readonly outcome: "accepted" | "duplicate" | "ignored" | "opened" | "closed" | "selected";
}

function nextForgeStatus(availableShards: number, selectedCount: number): ForgeRewardState {
  if (selectedCount >= MAXIMUM_RUN_UPGRADES)
    return Object.freeze({ status: "exhausted", cost: null });
  const cost = FORGE_COSTS[selectedCount] as number;
  return Object.freeze({ status: availableShards >= cost ? "ready" : "dormant", cost });
}

export function createInitialRewardState(): RunRewardState {
  return Object.freeze({
    availableShards: 0,
    totalCollectedShards: 0,
    openedChestIds: new Set<string>(),
    collectedPickupIds: new Set<string>(),
    flasksConsumed: 0,
    selectedUpgradeIds: Object.freeze([]),
    forge: Object.freeze({ status: "dormant", cost: FORGE_COSTS[0] }),
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
        : nextForgeStatus(availableShards, state.selectedUpgradeIds.length),
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
  if (state.forge.status !== "ready" || offer.index !== state.selectedUpgradeIds.length) {
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
      forge: nextForgeStatus(state.availableShards, state.selectedUpgradeIds.length),
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
  if (state.availableShards < state.forge.cost) {
    return Object.freeze({ state, outcome: "ignored" });
  }
  const selectedUpgradeIds = stableUpgradeIds([...state.selectedUpgradeIds, rawUpgradeId]);
  const availableShards = state.availableShards - state.forge.cost;
  return Object.freeze({
    state: Object.freeze({
      ...state,
      availableShards,
      selectedUpgradeIds,
      forge: nextForgeStatus(availableShards, selectedUpgradeIds.length),
    }),
    outcome: "selected",
  });
}
