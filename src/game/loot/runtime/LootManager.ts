import Phaser from "phaser";

import type { PlayerVitality, Vector2 } from "../../combat/types";
import type { DungeonLayout } from "../../dungeon/types";
import { Runeforge } from "../../entities/Runeforge";
import { RunicShardPickup } from "../../entities/RunicShardPickup";
import { TreasureChest } from "../../entities/TreasureChest";
import { VitalityFlask } from "../../entities/VitalityFlask";
import type { GameplayInteractionCandidate } from "../../interaction/selection";
import { createUpgradeOffer } from "../../upgrades/offer";
import type { UpgradeId, UpgradeOffer } from "../../upgrades/types";
import type { FloorNumber } from "../../run/types";
import { LOOT_CONFIG } from "../config";
import type { ForgeMarkerState } from "../minimapLoot";
import {
  closeForgeOffer,
  collectShardPickup,
  createInitialRewardState,
  openForgeOffer,
  openRewardChest,
  recordFlaskConsumption,
  selectForgeUpgrade,
  type RunRewardState,
  type InitialRewardCarry,
} from "../rewardState";
import { resolveSafeDropPosition } from "../safeDropPosition";
import type { LootPickupSummary, LootPlan } from "../types";

interface EnemyDefeatDetails {
  readonly enemyId: string;
  readonly roomId: number;
  readonly position: Vector2;
}

interface LootManagerCallbacks {
  readonly stateChanged: (state: RunRewardState, becameReady: boolean) => void;
  readonly chestOpened: (chestId: string) => void;
  readonly healed: (vitality: PlayerVitality, restoredHealth: number) => void;
  readonly shardCollected?: (amount: number) => void;
  readonly healPlayer: (
    amount: number,
  ) => Readonly<{ consumed: boolean; restoredHealth: number; vitality: PlayerVitality }>;
}

interface LootManagerOptions {
  readonly floorNumber?: FloorNumber;
  readonly carry?: InitialRewardCarry;
}

type PickupRuntime =
  | Readonly<{
      type: "shard";
      id: string;
      sourceId: string;
      amount: number;
      collectibleAt: number;
      object: RunicShardPickup;
    }>
  | Readonly<{
      type: "flask";
      id: string;
      sourceId: string;
      amount: number;
      collectibleAt: number;
      object: VitalityFlask;
    }>;

export class LootManager {
  private readonly chests = new Map<string, TreasureChest>();
  private readonly forge: Runeforge;
  private readonly pickups = new Map<string, PickupRuntime>();
  private readonly emittedSources = new Set<string>();
  private readonly armedPickupIds = new Set<string>();
  private state: RunRewardState = createInitialRewardState();
  private active = true;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly layout: DungeonLayout,
    public readonly plan: LootPlan,
    private readonly callbacks: LootManagerCallbacks,
    private readonly options: LootManagerOptions = {},
  ) {
    this.state = createInitialRewardState(options.carry);
    plan.chests.forEach((chestPlan) => {
      this.chests.set(chestPlan.id, new TreasureChest(scene, chestPlan));
    });
    this.forge = new Runeforge(scene, plan.forge);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  public update(playerPosition: Readonly<{ x: number; y: number }>): void {
    if (!this.active) return;
    const radiusSquared = LOOT_CONFIG.pickupCollectionRadius ** 2;
    [...this.pickups.values()].forEach((pickup) => {
      if (!pickup.object.active) return;
      const deltaX = pickup.object.x - playerPosition.x;
      const deltaY = pickup.object.y - playerPosition.y;
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      if (!this.armedPickupIds.has(pickup.id)) {
        if (distanceSquared > radiusSquared) this.armedPickupIds.add(pickup.id);
        return;
      }
      if (this.scene.time.now < pickup.collectibleAt || distanceSquared > radiusSquared) return;
      if (pickup.type === "shard") this.collectShard(pickup);
      else this.collectFlask(pickup);
    });
  }

  public getInteractionCandidates(): readonly GameplayInteractionCandidate[] {
    const chestCandidates = [...this.chests.values()]
      .filter((chest) => !chest.isOpened())
      .map((chest) =>
        Object.freeze({
          id: chest.plan.id,
          type: "chest" as const,
          position: chest.plan.position,
          available: this.active,
        }),
      );
    const forgeCandidate: GameplayInteractionCandidate = Object.freeze({
      id: "runeforge",
      type: "forge",
      position: this.plan.forge.position,
      available: this.active && this.state.forge.status !== "exhausted",
    });
    return Object.freeze([...chestCandidates, forgeCandidate]);
  }

  public openChest(chestId: string): boolean {
    if (!this.active) return false;
    const chest = this.chests.get(chestId);
    const plan = this.plan.chests.find((candidate) => candidate.id === chestId);
    if (!chest || !plan || chest.isOpened()) return false;
    const transition = openRewardChest(this.state, chestId);
    if (transition.outcome !== "accepted" || !chest.open()) return false;
    this.state = transition.state;
    this.spawnReward(chestId, plan.roomId, plan.position, plan.shardAmount, plan.containsFlask);
    this.createRewardBurst(plan.position.x, plan.position.y);
    this.callbacks.chestOpened(chestId);
    this.notifyStateChanged(false);
    return true;
  }

  public dropEnemyReward(details: EnemyDefeatDetails): void {
    if (!this.active || this.emittedSources.has(details.enemyId)) return;
    const reward = this.plan.enemyRewards.find(
      (candidate) => candidate.enemyId === details.enemyId,
    );
    if (!reward) throw new RangeError(`Enemy ${details.enemyId} has no deterministic loot reward.`);
    const position = resolveSafeDropPosition(this.layout, details.roomId, details.position);
    this.spawnReward(
      details.enemyId,
      details.roomId,
      position,
      reward.shardAmount,
      reward.containsFlask,
    );
  }

  public inspectOrOpenForge():
    | Readonly<{ outcome: "insufficient"; available: number; cost: number }>
    | Readonly<{ outcome: "opened"; offer: UpgradeOffer }>
    | Readonly<{ outcome: "ignored" }> {
    if (!this.active || this.state.forge.status === "exhausted") {
      return Object.freeze({ outcome: "ignored" });
    }
    if (this.state.forge.status === "dormant") {
      return Object.freeze({
        outcome: "insufficient",
        available: this.state.availableShards,
        cost: this.state.forge.cost,
      });
    }
    if (this.state.forge.status === "choosing") {
      return Object.freeze({ outcome: "opened", offer: this.state.forge.offer });
    }
    const offer = createUpgradeOffer(
      this.plan.fingerprint,
      this.options.floorNumber ?? 1,
      this.state.forgePurchasesThisFloor,
      this.state.selectedUpgradeIds,
    );
    const transition = openForgeOffer(this.state, offer);
    if (transition.outcome !== "opened") return Object.freeze({ outcome: "ignored" });
    this.state = transition.state;
    this.notifyStateChanged(false);
    return Object.freeze({ outcome: "opened", offer });
  }

  public closeForge(): void {
    const transition = closeForgeOffer(this.state);
    if (transition.outcome !== "closed") return;
    this.state = transition.state;
    this.notifyStateChanged(false);
  }

  public selectUpgrade(upgradeId: UpgradeId): boolean {
    const transition = selectForgeUpgrade(this.state, upgradeId);
    if (transition.outcome !== "selected") return false;
    this.state = transition.state;
    this.notifyStateChanged(false);
    return true;
  }

  public getState(): RunRewardState {
    return this.state;
  }

  public getForgeMarkerState(): ForgeMarkerState {
    if (this.state.forge.status === "exhausted") return "exhausted";
    return this.state.forge.status === "ready" || this.state.forge.status === "choosing"
      ? "ready"
      : "dormant";
  }

  public getPickupSummaries(): readonly LootPickupSummary[] {
    return Object.freeze(
      [...this.pickups.values()]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((pickup) =>
          Object.freeze({
            id: pickup.id,
            type: pickup.type,
            amount: pickup.amount,
            position: Object.freeze({ x: pickup.object.x, y: pickup.object.y }),
            active: pickup.object.active,
            sourceId: pickup.sourceId,
          }),
        ),
    );
  }

  public getChestSummaries(): readonly Readonly<{
    id: string;
    roomId: number;
    position: Readonly<{ x: number; y: number }>;
    opened: boolean;
    shardAmount: number;
    containsFlask: boolean;
  }>[] {
    return Object.freeze(
      this.plan.chests.map((plan) =>
        Object.freeze({
          id: plan.id,
          roomId: plan.roomId,
          position: Object.freeze({ x: plan.position.x, y: plan.position.y }),
          opened: this.chests.get(plan.id)?.isOpened() === true,
          shardAmount: plan.shardAmount,
          containsFlask: plan.containsFlask,
        }),
      ),
    );
  }

  public getForgeObject(): Runeforge {
    return this.forge;
  }

  public freeze(): void {
    this.active = false;
    this.forge.freeze();
    this.pickups.forEach((pickup) => pickup.object.freeze());
  }

  public destroy(): void {
    this.active = false;
    this.pickups.forEach((pickup) => pickup.object.destroy());
    this.pickups.clear();
    this.armedPickupIds.clear();
    this.chests.forEach((chest) => chest.destroy());
    this.chests.clear();
    this.forge.destroy();
  }

  private spawnReward(
    sourceId: string,
    roomId: number,
    origin: Readonly<{ x: number; y: number }>,
    shardAmount: number,
    containsFlask: boolean,
  ): void {
    if (this.emittedSources.has(sourceId)) return;
    this.emittedSources.add(sourceId);
    const shardPoint = resolveSafeDropPosition(this.layout, roomId, {
      x: origin.x - 38,
      y: origin.y,
    });
    const shardId = `${sourceId}:shards`;
    const shard = new RunicShardPickup(
      this.scene,
      shardId,
      sourceId,
      shardAmount,
      shardPoint.x,
      shardPoint.y,
    );
    this.pickups.set(
      shardId,
      Object.freeze({
        type: "shard",
        id: shardId,
        sourceId,
        amount: shardAmount,
        collectibleAt: this.scene.time.now + 220,
        object: shard,
      }),
    );
    if (containsFlask) {
      const flaskPoint = resolveSafeDropPosition(this.layout, roomId, {
        x: origin.x + 38,
        y: origin.y,
      });
      const flaskId = `${sourceId}:flask`;
      const flask = new VitalityFlask(this.scene, flaskId, sourceId, flaskPoint.x, flaskPoint.y);
      this.pickups.set(
        flaskId,
        Object.freeze({
          type: "flask",
          id: flaskId,
          sourceId,
          amount: LOOT_CONFIG.flaskHealing,
          collectibleAt: this.scene.time.now + 220,
          object: flask,
        }),
      );
    }
  }

  private collectShard(pickup: Extract<PickupRuntime, { type: "shard" }>): void {
    const wasReady = this.getForgeMarkerState() === "ready";
    const transition = collectShardPickup(this.state, pickup.id, pickup.amount);
    if (transition.outcome !== "accepted") return;
    this.state = transition.state;
    this.pickups.delete(pickup.id);
    this.armedPickupIds.delete(pickup.id);
    this.createCollectionEffect(pickup.object.x, pickup.object.y, 0x78e5d4);
    pickup.object.destroy();
    this.callbacks.shardCollected?.(pickup.amount);
    this.notifyStateChanged(!wasReady && this.getForgeMarkerState() === "ready");
  }

  private collectFlask(pickup: Extract<PickupRuntime, { type: "flask" }>): void {
    const healing = this.callbacks.healPlayer(LOOT_CONFIG.flaskHealing);
    if (!healing.consumed) return;
    const transition = recordFlaskConsumption(this.state, pickup.id);
    if (transition.outcome !== "accepted") return;
    this.state = transition.state;
    this.pickups.delete(pickup.id);
    this.armedPickupIds.delete(pickup.id);
    this.createCollectionEffect(pickup.object.x, pickup.object.y, 0x7fe59a);
    pickup.object.destroy();
    this.callbacks.healed(healing.vitality, healing.restoredHealth);
    this.notifyStateChanged(false);
  }

  private notifyStateChanged(becameReady: boolean): void {
    this.forge.setForgeState(this.getForgeMarkerState());
    this.callbacks.stateChanged(this.state, becameReady);
  }

  private createRewardBurst(x: number, y: number): void {
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      const spark = this.scene.add
        .circle(x, y, 3, index % 2 === 0 ? 0xe7bc62 : 0x70d3c8, 0.9)
        .setDepth(7);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 25,
        y: y + Math.sin(angle) * 18,
        alpha: 0,
        duration: 260,
        onComplete: () => spark.destroy(),
      });
    }
  }

  private createCollectionEffect(x: number, y: number, color: number): void {
    const ring = this.scene.add.circle(x, y, 8, color, 0).setStrokeStyle(2, color, 0.9).setDepth(7);
    this.scene.tweens.add({
      targets: ring,
      scale: 2.5,
      alpha: 0,
      duration: 220,
      onComplete: () => ring.destroy(),
    });
  }
}
