import Phaser from "phaser";

import { CombatController } from "../combat/CombatController";
import { transitionRunOutcome } from "../combat/runOutcome";
import type { RunOutcome } from "../combat/types";
import { SCENE_KEYS } from "../constants";
import {
  createRoomDiscovery,
  updateRoomDiscovery,
  type RoomDiscoveryState,
} from "../dungeon/discovery";
import { generateDungeon } from "../dungeon/generateDungeon";
import { isWalkableWorldPoint, tileIndex } from "../dungeon/navigation";
import {
  ACTIVE_SEED_REGISTRY_KEY,
  createFriendlySeed,
  replaceSeedInUrl,
} from "../dungeon/seedSession";
import type { DungeonLayout } from "../dungeon/types";
import { EnemyManager, type EnemySummary } from "../enemies/EnemyManager";
import { createEncounterPlan } from "../encounters/createEncounterPlan";
import { deriveThreatRoomIds } from "../encounters/minimapThreats";
import type { EncounterPlan } from "../encounters/types";
import { AncientGate } from "../entities/AncientGate";
import { Player } from "../entities/Player";
import { RunicKey } from "../entities/RunicKey";
import type { MovementInput } from "../input/movement";
import {
  selectGameplayInteractionTarget,
  type GameplayInteractionCandidate,
} from "../interaction/selection";
import { createLootPlan } from "../loot/createLootPlan";
import { LootManager } from "../loot/runtime/LootManager";
import type { RunRewardState } from "../loot/rewardState";
import { createInitialRewardState } from "../loot/rewardState";
import type { LootPlan } from "../loot/types";
import { OBJECTIVE_CONFIG } from "../objective/config";
import { createEscapeObjective } from "../objective/createEscapeObjective";
import {
  createInitialObjectiveState,
  objectiveHasKey,
  reduceObjectiveState,
} from "../objective/objectiveState";
import type { EscapeObjectivePlan, EscapeObjectiveState } from "../objective/types";
import { DungeonRenderer } from "../rendering/DungeonRenderer";
import { announceGameState } from "../ui/announce";
import { DungeonHud } from "../ui/DungeonHud";
import { DungeonMinimap } from "../ui/DungeonMinimap";
import { FloorCompleteOverlay } from "../ui/FloorCompleteOverlay";
import { InteractionPrompt } from "../ui/InteractionPrompt";
import { ObjectiveToast } from "../ui/ObjectiveToast";
import { PlayerDefeatedOverlay } from "../ui/PlayerDefeatedOverlay";
import { UpgradeChoiceOverlay } from "../ui/UpgradeChoiceOverlay";
import { transitionActiveRunActivity, type ActiveRunActivity } from "../upgrades/activityState";
import { getUpgrade } from "../upgrades/catalog";
import { deriveEffectivePlayerStats } from "../upgrades/effectiveStats";
import type { UpgradeId } from "../upgrades/types";

interface MovementKeys {
  readonly up: Phaser.Input.Keyboard.Key;
  readonly down: Phaser.Input.Keyboard.Key;
  readonly left: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
}

interface GameSceneData {
  readonly seed?: string;
  readonly entry?: "restart" | "new";
}

export interface GameSceneSnapshot {
  readonly playerPosition: { readonly x: number; readonly y: number };
  readonly spawnPosition: { readonly x: number; readonly y: number };
  readonly seed: string;
  readonly layoutFingerprint: string;
  readonly objectiveFingerprint: string;
  readonly encounterFingerprint: string;
  readonly lootFingerprint: string;
  readonly roomCount: number;
  readonly spawnRoomId: number;
  readonly destinationRoomId: number;
  readonly keyRoomId: number;
  readonly gateRoomId: number;
  readonly keyPosition: { readonly x: number; readonly y: number };
  readonly gatePosition: { readonly x: number; readonly y: number };
  readonly worldSize: { readonly width: number; readonly height: number };
  readonly discoveredRoomCount: number;
  readonly currentRoomId: number;
  readonly playerOnWalkableTile: boolean;
  readonly objectiveStatus: EscapeObjectiveState["status"];
  readonly keyCollected: boolean;
  readonly keyObjectActive: boolean;
  readonly gateReady: boolean;
  readonly floorComplete: boolean;
  readonly movementEnabled: boolean;
  readonly interactionPrompt: string | null;
  readonly elapsedTimeMs: number;
  readonly totalEnemyCount: number;
  readonly aliveEnemyCount: number;
  readonly defeatedEnemyCount: number;
  readonly playerHealth: number;
  readonly playerMaximumHealth: number;
  readonly playerFacing: { readonly x: number; readonly y: number };
  readonly playerVitalityStatus: "alive" | "defeated";
  readonly playerInvulnerable: boolean;
  readonly playerHitStunned: boolean;
  readonly playerAttackState: string;
  readonly playerDashState: string;
  readonly dashReady: boolean;
  readonly runOutcome: RunOutcome;
  readonly activeEnemyProjectileCount: number;
  readonly defeatOverlayVisible: boolean;
  readonly completionOverlayVisible: boolean;
  readonly threatRoomCount: number;
  readonly enemies: readonly EnemySummary[];
  readonly forgeRoomId: number;
  readonly forgePosition: { readonly x: number; readonly y: number };
  readonly forgeState: string;
  readonly availableShardCount: number;
  readonly totalCollectedShardCount: number;
  readonly currentForgeCost: number | null;
  readonly forgeUpgradesCompleted: number;
  readonly forgeExhausted: boolean;
  readonly upgradeOverlayVisible: boolean;
  readonly currentUpgradeOfferIds: readonly UpgradeId[];
  readonly currentUpgradeOfferFingerprint: string | null;
  readonly selectedUpgradeIds: readonly UpgradeId[];
  readonly effectiveMeleeDamage: number;
  readonly effectiveMeleeRange: number;
  readonly effectiveAttackRecovery: number;
  readonly effectiveAttackCooldown: number;
  readonly effectiveDashCooldown: number;
  readonly effectiveMaximumHealth: number;
  readonly effectivePostHitInvulnerability: number;
  readonly totalChestCount: number;
  readonly openedChestCount: number;
  readonly chests: ReturnType<LootManager["getChestSummaries"]>;
  readonly pickups: ReturnType<LootManager["getPickupSummaries"]>;
  readonly flaskConsumptionCount: number;
  readonly enemyRewards: LootPlan["enemyRewards"];
  readonly runActivity: ActiveRunActivity;
}

export class GameScene extends Phaser.Scene {
  private layout?: DungeonLayout;
  private objectivePlan?: EscapeObjectivePlan;
  private encounterPlan?: EncounterPlan;
  private lootPlan?: LootPlan;
  private objectiveState: EscapeObjectiveState = createInitialObjectiveState();
  private runOutcome: RunOutcome = "active";
  private runActivity: ActiveRunActivity = "playing";
  private player?: Player;
  private runicKey?: RunicKey;
  private ancientGate?: AncientGate;
  private enemies?: EnemyManager;
  private combat?: CombatController;
  private loot?: LootManager;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: MovementKeys;
  private interactionKey?: Phaser.Input.Keyboard.Key;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private newDungeonKey?: Phaser.Input.Keyboard.Key;
  private attackSpaceKey?: Phaser.Input.Keyboard.Key;
  private attackJKey?: Phaser.Input.Keyboard.Key;
  private dashKey?: Phaser.Input.Keyboard.Key;
  private discovery?: RoomDiscoveryState;
  private minimap?: DungeonMinimap;
  private hud?: DungeonHud;
  private interactionPrompt?: InteractionPrompt;
  private objectiveToast?: ObjectiveToast;
  private completionOverlay?: FloorCompleteOverlay;
  private defeatOverlay?: PlayerDefeatedOverlay;
  private upgradeOverlay?: UpgradeChoiceOverlay;
  private lastPlayerTileIndex = -1;
  private elapsedTimeMs = 0;
  private isTransitioning = false;
  private isInteractionHeld = false;
  private isSpaceAttackHeld = false;
  private isJAttackHeld = false;
  private isDashHeld = false;

  public constructor() {
    super(SCENE_KEYS.GAME);
  }

  public create(data: GameSceneData = {}): void {
    this.resetRuntimeState();
    const registrySeed = this.registry.get(ACTIVE_SEED_REGISTRY_KEY) as unknown;
    const requestedSeed =
      data.seed ?? (typeof registrySeed === "string" ? registrySeed : createFriendlySeed());

    try {
      this.layout = generateDungeon(requestedSeed);
      this.objectivePlan = createEscapeObjective(this.layout);
      this.encounterPlan = createEncounterPlan(this.layout, this.objectivePlan);
      this.lootPlan = createLootPlan(this.layout, this.objectivePlan, this.encounterPlan);
    } catch {
      announceGameState(
        "Dungeon encounter planning failed safely. Return to the menu and try a new seed.",
      );
      this.scene.start(SCENE_KEYS.MENU);
      return;
    }

    this.registry.set(ACTIVE_SEED_REGISTRY_KEY, this.layout.seed);
    replaceSeedInUrl(this.layout.seed);
    this.physics.world.setBounds(0, 0, this.layout.worldWidth, this.layout.worldHeight);

    const renderer = new DungeonRenderer(this, this.layout);
    renderer.build();
    this.runicKey = new RunicKey(this, this.objectivePlan.keyPosition);
    this.ancientGate = new AncientGate(this, this.objectivePlan.gatePosition);
    this.player = new Player(this, this.layout.spawn);
    this.physics.add.collider(this.player, renderer.collisionGroup);
    this.discovery = createRoomDiscovery(this.layout.spawnRoomId);
    this.enemies = new EnemyManager(
      this,
      this.layout,
      this.encounterPlan,
      this.player,
      renderer.collisionGroup,
      {
        damagePlayer: (source) => this.handlePlayerDamage(source),
        enemyDefeated: (details) => this.handleEnemyDefeated(details),
      },
    );
    this.combat = new CombatController(this, this.player, this.enemies, {
      healthChanged: (vitality) => this.hud?.updateHealth(vitality),
      playerDefeated: () => this.defeatRun(),
    });
    this.loot = new LootManager(this, this.layout, this.lootPlan, {
      stateChanged: (state, becameReady) => this.handleRewardStateChanged(state, becameReady),
      chestOpened: () => {
        this.objectiveToast?.show("TREASURE CHEST OPENED", "Its runes spill onto the floor.");
        announceGameState("Treasure Chest opened.");
      },
      healPlayer: (amount) =>
        this.combat?.heal(amount) ?? {
          consumed: false,
          restoredHealth: 0,
          vitality: this.combat?.getVitality() ?? {
            status: "defeated",
            health: 0,
            maximumHealth: 5,
          },
        },
      healed: (vitality, restoredHealth) => {
        this.objectiveToast?.show(
          "VITALITY RESTORED",
          `${restoredHealth} health restored. ${vitality.health} / ${vitality.maximumHealth}`,
        );
        announceGameState(
          `Vitality Flask restored ${restoredHealth} health. ${vitality.health} health remaining.`,
        );
      },
    });

    this.hud = new DungeonHud(this, this.layout, this.encounterPlan.enemies.length);
    this.hud.updateObjective(this.objectiveState);
    this.hud.updateTimer(0);
    this.hud.updateHealth(this.combat.getVitality());
    this.hud.updateEnemies(0, this.encounterPlan.enemies.length);
    this.hud.updateDash(this.combat.getDashState());
    this.hud.updateRewards(this.loot.getState(), this.lootPlan.chests.length);
    this.minimap = new DungeonMinimap(
      this,
      this.layout,
      this.objectivePlan,
      this.encounterPlan,
      this.lootPlan,
    );
    this.minimap.update(
      this.discovery,
      this.objectiveState,
      this.enemies.getAliveEnemyIds(),
      this.loot.getState(),
    );
    this.interactionPrompt = new InteractionPrompt(this);
    this.objectiveToast = new ObjectiveToast(this);

    this.configureCamera();
    this.registerInput();
    this.lastPlayerTileIndex = tileIndex(
      this.layout.spawn.tileX,
      this.layout.spawn.tileY,
      this.layout.mapWidth,
    );
    this.announceFloorStart(data.entry);
  }

  public override update(_time: number, delta: number): void {
    if (
      !this.player ||
      !this.cursors ||
      !this.wasd ||
      !this.layout ||
      !this.discovery ||
      !this.combat ||
      !this.enemies ||
      !this.loot
    ) {
      return;
    }
    if (this.runOutcome !== "active" || this.runActivity !== "playing" || this.isTransitioning) {
      this.player.stopMovement();
      return;
    }

    this.elapsedTimeMs += Number.isFinite(delta) && delta > 0 ? delta : 0;
    this.hud?.updateTimer(this.elapsedTimeMs);
    const movementInput = this.readMovementInput();
    this.combat.update(delta, movementInput);
    this.hud?.updateDash(this.combat.getDashState());
    this.updateDiscovery();
    this.enemies.update(delta, this.discovery);
    this.loot.update(this.player);
    this.updateInteractionPrompt();
  }

  public getTestSnapshot(): GameSceneSnapshot | null {
    if (
      !this.player ||
      !this.layout ||
      !this.objectivePlan ||
      !this.encounterPlan ||
      !this.lootPlan ||
      !this.discovery ||
      !this.enemies ||
      !this.combat ||
      !this.loot
    ) {
      return null;
    }
    const spawnPoint = this.player.getSpawnPoint();
    const completedTime =
      this.objectiveState.status === "completed"
        ? this.objectiveState.completionTimeMs
        : this.elapsedTimeMs;
    const vitality = this.combat.getVitality();
    const attack = this.combat.getAttackState();
    const dash = this.combat.getDashState();
    const aliveEnemyIds = this.enemies.getAliveEnemyIds();
    const rewardState = this.loot.getState();
    const effectiveStats = this.combat.getEffectiveStats();
    const activeOffer = rewardState.forge.status === "choosing" ? rewardState.forge.offer : null;

    return {
      playerPosition: { x: this.player.x, y: this.player.y },
      spawnPosition: { x: spawnPoint.x, y: spawnPoint.y },
      seed: this.layout.seed,
      layoutFingerprint: this.layout.fingerprint,
      objectiveFingerprint: this.objectivePlan.fingerprint,
      encounterFingerprint: this.encounterPlan.fingerprint,
      lootFingerprint: this.lootPlan.fingerprint,
      roomCount: this.layout.rooms.length,
      spawnRoomId: this.layout.spawnRoomId,
      destinationRoomId: this.layout.destinationRoomId,
      keyRoomId: this.objectivePlan.keyRoomId,
      gateRoomId: this.objectivePlan.gateRoomId,
      keyPosition: { x: this.objectivePlan.keyPosition.x, y: this.objectivePlan.keyPosition.y },
      gatePosition: { x: this.objectivePlan.gatePosition.x, y: this.objectivePlan.gatePosition.y },
      worldSize: { width: this.layout.worldWidth, height: this.layout.worldHeight },
      discoveredRoomCount: this.discovery.discoveredRoomIds.size,
      currentRoomId: this.discovery.currentRoomId,
      playerOnWalkableTile: isWalkableWorldPoint(this.layout, this.player.x, this.player.y),
      objectiveStatus: this.objectiveState.status,
      keyCollected: objectiveHasKey(this.objectiveState),
      keyObjectActive: this.runicKey?.active === true && this.runicKey.visible,
      gateReady: this.ancientGate?.isReady() === true,
      floorComplete: this.runOutcome === "escaped",
      movementEnabled:
        this.runOutcome === "active" && this.runActivity === "playing" && !this.isTransitioning,
      interactionPrompt: this.interactionPrompt?.getText() ?? null,
      elapsedTimeMs: completedTime,
      totalEnemyCount: this.enemies.getTotalCount(),
      aliveEnemyCount: aliveEnemyIds.size,
      defeatedEnemyCount: this.enemies.getDefeatedCount(),
      playerHealth: vitality.health,
      playerMaximumHealth: vitality.maximumHealth,
      playerFacing: this.player.getFacing(),
      playerVitalityStatus: vitality.status,
      playerInvulnerable: this.combat.isInvulnerable(),
      playerHitStunned: vitality.status === "alive" && vitality.hitStunRemainingMs > 0,
      playerAttackState: attack.phase,
      playerDashState: dash.status,
      dashReady: dash.status === "ready",
      runOutcome: this.runOutcome,
      activeEnemyProjectileCount: this.enemies.getActiveProjectileCount(),
      defeatOverlayVisible: this.defeatOverlay !== undefined,
      completionOverlayVisible: this.completionOverlay !== undefined,
      threatRoomCount: deriveThreatRoomIds(this.discovery, this.encounterPlan, aliveEnemyIds)
        .length,
      enemies: this.enemies.getSummaries(),
      forgeRoomId: this.lootPlan.forge.roomId,
      forgePosition: { x: this.lootPlan.forge.position.x, y: this.lootPlan.forge.position.y },
      forgeState: rewardState.forge.status,
      availableShardCount: rewardState.availableShards,
      totalCollectedShardCount: rewardState.totalCollectedShards,
      currentForgeCost: rewardState.forge.cost,
      forgeUpgradesCompleted: rewardState.selectedUpgradeIds.length,
      forgeExhausted: rewardState.forge.status === "exhausted",
      upgradeOverlayVisible: this.upgradeOverlay !== undefined,
      currentUpgradeOfferIds: activeOffer?.upgradeIds ?? [],
      currentUpgradeOfferFingerprint: activeOffer?.fingerprint ?? null,
      selectedUpgradeIds: rewardState.selectedUpgradeIds,
      effectiveMeleeDamage: effectiveStats.meleeDamage,
      effectiveMeleeRange: effectiveStats.meleeRange,
      effectiveAttackRecovery: effectiveStats.attackRecoveryMs,
      effectiveAttackCooldown: effectiveStats.attackCooldownMs,
      effectiveDashCooldown: effectiveStats.dashCooldownMs,
      effectiveMaximumHealth: effectiveStats.maximumHealth,
      effectivePostHitInvulnerability: effectiveStats.postHitInvulnerabilityMs,
      totalChestCount: this.lootPlan.chests.length,
      openedChestCount: rewardState.openedChestIds.size,
      chests: this.loot.getChestSummaries(),
      pickups: this.loot.getPickupSummaries(),
      flaskConsumptionCount: rewardState.flasksConsumed,
      enemyRewards: this.lootPlan.enemyRewards,
      runActivity: this.runActivity,
    };
  }

  private resetRuntimeState(): void {
    this.objectiveState = createInitialObjectiveState();
    this.runOutcome = "active";
    this.runActivity = "playing";
    this.elapsedTimeMs = 0;
    this.lastPlayerTileIndex = -1;
    this.isTransitioning = false;
    this.isInteractionHeld = false;
    this.isSpaceAttackHeld = false;
    this.isJAttackHeld = false;
    this.isDashHeld = false;
    this.completionOverlay = undefined;
    this.defeatOverlay = undefined;
    this.upgradeOverlay = undefined;
  }

  private configureCamera(): void {
    if (!this.player || !this.layout) return;
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.layout.worldWidth, this.layout.worldHeight);
    camera.setBackgroundColor(0x050709);
    camera.startFollow(this.player, true, 0.1, 0.1);
    camera.setDeadzone(230, 125);
    camera.fadeIn(220, 5, 7, 9);
  }

  private registerInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Dungeon Escape requires keyboard input support.");

    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.interactionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.restartKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.newDungeonKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.attackSpaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.attackJKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.dashKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.interactionKey.on("down", this.handleInteractionDown, this);
    this.interactionKey.on("up", this.handleInteractionUp, this);
    this.restartKey.on("down", this.handleActiveRestart, this);
    this.newDungeonKey.on("down", this.handleActiveNewDungeon, this);
    this.attackSpaceKey.on("down", this.handleSpaceAttackDown, this);
    this.attackSpaceKey.on("up", this.handleSpaceAttackUp, this);
    this.attackJKey.on("down", this.handleJAttackDown, this);
    this.attackJKey.on("up", this.handleJAttackUp, this);
    this.dashKey.on("down", this.handleDashDown, this);
    this.dashKey.on("up", this.handleDashUp, this);
    this.input.on("pointerdown", this.handlePointerAttack, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanUpInput, this);
  }

  private handleInteractionDown(): void {
    if (this.isInteractionHeld) return;
    this.isInteractionHeld = true;
    this.interact();
  }

  private handleInteractionUp(): void {
    this.isInteractionHeld = false;
  }

  private handleSpaceAttackDown(): void {
    if (this.isSpaceAttackHeld) return;
    this.isSpaceAttackHeld = true;
    this.attack();
  }

  private handleSpaceAttackUp(): void {
    this.isSpaceAttackHeld = false;
  }

  private handleJAttackDown(): void {
    if (this.isJAttackHeld) return;
    this.isJAttackHeld = true;
    this.attack();
  }

  private handleJAttackUp(): void {
    this.isJAttackHeld = false;
  }

  private handleDashDown(): void {
    if (this.isDashHeld) return;
    this.isDashHeld = true;
    if (this.runOutcome === "active" && this.runActivity === "playing" && !this.isTransitioning) {
      this.combat?.beginDash(this.readMovementInput());
    }
  }

  private handleDashUp(): void {
    this.isDashHeld = false;
  }

  private handlePointerAttack(pointer: Phaser.Input.Pointer): void {
    if (
      pointer.button !== 0 ||
      this.runOutcome !== "active" ||
      this.runActivity !== "playing" ||
      this.isTransitioning
    )
      return;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.combat?.beginPointerAttack(worldPoint);
  }

  private handleActiveRestart(): void {
    if (this.runOutcome !== "active" || this.runActivity !== "playing") return;
    this.restartFloor();
  }

  private handleActiveNewDungeon(): void {
    if (this.runOutcome !== "active" || this.runActivity !== "playing") return;
    this.generateNewDungeon();
  }

  private attack(): void {
    if (this.runOutcome !== "active" || this.runActivity !== "playing" || this.isTransitioning)
      return;
    this.combat?.beginFacingAttack();
  }

  private interact(): void {
    if (
      !this.player ||
      this.runOutcome !== "active" ||
      this.runActivity !== "playing" ||
      this.isTransitioning ||
      this.combat?.canInteract() !== true
    ) {
      return;
    }
    const target = this.currentInteractionTarget();
    if (target?.type === "key") this.collectKey();
    if (target?.type === "gate") this.attemptGate();
    if (target?.type === "chest") this.loot?.openChest(target.id);
    if (target?.type === "forge") this.interactWithForge();
  }

  private currentInteractionTarget(): GameplayInteractionCandidate | null {
    if (
      !this.player ||
      !this.objectivePlan ||
      !this.loot ||
      this.runOutcome !== "active" ||
      this.runActivity !== "playing"
    )
      return null;
    return selectGameplayInteractionTarget(this.player, [
      {
        id: "key",
        type: "key",
        position: this.objectivePlan.keyPosition,
        available: this.objectiveState.status === "seeking-key" && this.runicKey?.active === true,
      },
      {
        id: "gate",
        type: "gate",
        position: this.objectivePlan.gatePosition,
        available: this.objectiveState.status !== "completed",
      },
      ...this.loot.getInteractionCandidates(),
    ]);
  }

  private collectKey(): void {
    const transition = reduceObjectiveState(this.objectiveState, { type: "collect-key" });
    if (transition.outcome !== "key-collected") return;
    this.objectiveState = transition.state;
    this.runicKey?.collect();
    this.ancientGate?.setReady(true);
    this.updateObjectivePresentation();
    this.objectiveToast?.show("RUNES AWAKENED", "The Ancient Gate can now be opened.");
    announceGameState("Runic Key collected. The Ancient Gate can now be opened.");
  }

  private attemptGate(): void {
    const transition = reduceObjectiveState(this.objectiveState, {
      type: "attempt-gate",
      elapsedTimeMs: this.elapsedTimeMs,
    });
    if (transition.outcome === "gate-blocked") {
      this.ancientGate?.playBlockedReaction();
      this.objectiveToast?.show("THE GATE IS SEALED", "Find the Runic Key.");
      announceGameState("The Ancient Gate is sealed. Find the Runic Key.");
      return;
    }
    if (transition.outcome !== "completed") return;
    this.objectiveState = transition.state;
    this.completeFloor();
  }

  private interactWithForge(): void {
    if (!this.loot || !this.player || this.upgradeOverlay) return;
    const result = this.loot.inspectOrOpenForge();
    if (result.outcome === "insufficient") {
      const message = `The Runeforge requires ${result.cost} shards. ${result.available} / ${result.cost} collected.`;
      this.objectiveToast?.show("THE RUNEFORGE SLUMBERS", message);
      announceGameState(message);
      return;
    }
    if (result.outcome !== "opened") return;
    const state = this.loot.getState();
    if (state.forge.status !== "choosing") return;
    this.runActivity = transitionActiveRunActivity(this.runActivity, "open-upgrade");
    this.player.stopMovement();
    this.combat?.pause();
    this.enemies?.pause();
    this.interactionPrompt?.setText(null);
    this.upgradeOverlay = new UpgradeChoiceOverlay(
      this,
      result.offer,
      state.availableShards,
      state.forge.cost,
      {
        select: (upgradeId) => this.selectUpgrade(upgradeId),
        close: () => this.closeUpgradeOverlay(),
      },
    );
    announceGameState(
      "Runeforge opened. Choose one of three run upgrades, or press Escape to leave.",
    );
  }

  private closeUpgradeOverlay(): void {
    if (this.runOutcome !== "active") return;
    this.loot?.closeForge();
    this.upgradeOverlay = undefined;
    this.runActivity = transitionActiveRunActivity(this.runActivity, "resume");
    this.enemies?.resume();
    this.updateInteractionPrompt();
  }

  private selectUpgrade(upgradeId: UpgradeId): void {
    if (this.runOutcome !== "active" || !this.loot || !this.combat) return;
    if (!this.loot.selectUpgrade(upgradeId)) return;
    const selected = this.loot.getState().selectedUpgradeIds;
    this.combat.applyEffectiveStats(
      deriveEffectivePlayerStats(selected),
      upgradeId === "vital-rune",
    );
    this.upgradeOverlay = undefined;
    this.runActivity = transitionActiveRunActivity(this.runActivity, "resume");
    this.enemies?.resume();
    const definition = getUpgrade(upgradeId);
    this.objectiveToast?.show(definition.name, definition.description);
    announceGameState(`${definition.name} selected. ${definition.description}`);
    this.handleRewardStateChanged(this.loot.getState(), false);
  }

  private closeUpgradeOverlayForTerminal(): void {
    if (!this.upgradeOverlay) return;
    this.upgradeOverlay.destroy();
    this.upgradeOverlay = undefined;
    this.loot?.closeForge();
    this.runActivity = "playing";
  }

  private completeFloor(): void {
    if (
      !this.player ||
      !this.layout ||
      !this.discovery ||
      !this.enemies ||
      !this.combat ||
      this.objectiveState.status !== "completed" ||
      this.runOutcome !== "active"
    ) {
      return;
    }
    this.runOutcome = transitionRunOutcome(this.runOutcome, "escape");
    this.closeUpgradeOverlayForTerminal();
    this.combat.stopTerminal();
    this.enemies.stopAll();
    this.loot?.freeze();
    this.interactionPrompt?.setText(null);
    this.hud?.updateObjective(this.objectiveState);
    this.hud?.updateTimer(this.objectiveState.completionTimeMs);
    this.updateMinimap();
    this.ancientGate?.playCompletion();
    this.cameras.main.flash(OBJECTIVE_CONFIG.completionTransitionMs, 202, 181, 122, false);
    announceGameState("Dungeon escaped. Replay this seed or generate a new dungeon.");

    this.time.delayedCall(OBJECTIVE_CONFIG.completionTransitionMs, () => {
      if (
        this.runOutcome !== "escaped" ||
        !this.layout ||
        !this.discovery ||
        !this.enemies ||
        !this.combat ||
        this.completionOverlay
      ) {
        return;
      }
      const vitality = this.combat.getVitality();
      const rewards = this.loot?.getState() ?? createInitialRewardState();
      this.completionOverlay = new FloorCompleteOverlay(
        this,
        {
          seed: this.layout.seed,
          completionTimeMs:
            this.objectiveState.status === "completed"
              ? this.objectiveState.completionTimeMs
              : this.elapsedTimeMs,
          discoveredRooms: this.discovery.discoveredRoomIds.size,
          totalRooms: this.layout.rooms.length,
          defeatedEnemies: this.enemies.getDefeatedCount(),
          totalEnemies: this.enemies.getTotalCount(),
          health: vitality.health,
          maximumHealth: vitality.maximumHealth,
          totalCollectedShards: rewards.totalCollectedShards,
          availableShards: rewards.availableShards,
          openedChests: rewards.openedChestIds.size,
          totalChests: this.lootPlan?.chests.length ?? 0,
          selectedUpgrades: rewards.selectedUpgradeIds.map((id) => getUpgrade(id).name),
        },
        {
          replay: () => this.restartFloor(),
          newDungeon: () => this.generateNewDungeon(),
        },
      );
    });
  }

  private handlePlayerDamage(source: Readonly<{ x: number; y: number }>): void {
    const outcome = this.combat?.receiveDamage(source) ?? "ignored";
    if (outcome !== "accepted" || !this.combat) return;
    const vitality = this.combat.getVitality();
    announceGameState(`Player damaged. ${vitality.health} health remaining.`);
  }

  private handleEnemyDefeated(
    details: Readonly<{
      enemyId: string;
      roomId: number;
      position: Readonly<{ x: number; y: number }>;
    }>,
  ): void {
    if (!this.enemies) return;
    this.loot?.dropEnemyReward(details);
    this.hud?.updateEnemies(this.enemies.getDefeatedCount(), this.enemies.getTotalCount());
    this.updateMinimap();
  }

  private handleRewardStateChanged(state: RunRewardState, becameReady: boolean): void {
    this.hud?.updateRewards(state, this.lootPlan?.chests.length ?? 0);
    this.updateMinimap();
    if (becameReady) {
      const cost = state.forge.cost;
      this.objectiveToast?.show(
        "RUNEFORGE READY",
        `Return to the spawn room. ${cost} shards are ready.`,
      );
      announceGameState(
        `The Runeforge is ready. Return to the spawn room to choose a run upgrade.`,
      );
    }
  }

  private defeatRun(): void {
    if (
      this.runOutcome !== "active" ||
      !this.layout ||
      !this.discovery ||
      !this.enemies ||
      !this.combat
    ) {
      return;
    }
    this.runOutcome = transitionRunOutcome(this.runOutcome, "defeat");
    this.closeUpgradeOverlayForTerminal();
    this.combat.stopTerminal();
    this.enemies.stopAll();
    this.loot?.freeze();
    this.interactionPrompt?.setText(null);
    this.cameras.main.flash(260, 122, 28, 35, false);
    announceGameState("Fallen in the Catacombs. Replay this seed or generate a new dungeon.");
    this.time.delayedCall(360, () => {
      if (
        this.runOutcome !== "defeated" ||
        !this.layout ||
        !this.discovery ||
        !this.enemies ||
        this.defeatOverlay
      ) {
        return;
      }
      this.defeatOverlay = new PlayerDefeatedOverlay(
        this,
        {
          seed: this.layout.seed,
          elapsedTimeMs: this.elapsedTimeMs,
          discoveredRooms: this.discovery.discoveredRoomIds.size,
          totalRooms: this.layout.rooms.length,
          defeatedEnemies: this.enemies.getDefeatedCount(),
          totalEnemies: this.enemies.getTotalCount(),
          totalCollectedShards: this.loot?.getState().totalCollectedShards ?? 0,
          availableShards: this.loot?.getState().availableShards ?? 0,
          openedChests: this.loot?.getState().openedChestIds.size ?? 0,
          totalChests: this.lootPlan?.chests.length ?? 0,
          selectedUpgrades:
            this.loot?.getState().selectedUpgradeIds.map((id) => getUpgrade(id).name) ?? [],
        },
        {
          replay: () => this.restartFloor(),
          newDungeon: () => this.generateNewDungeon(),
        },
      );
    });
  }

  private restartFloor(): void {
    if (this.isTransitioning || !this.layout) return;
    this.isTransitioning = true;
    this.combat?.stopTerminal();
    this.enemies?.stopAll();
    this.loot?.freeze();
    this.upgradeOverlay?.destroy();
    this.interactionPrompt?.setText(null);
    this.registry.set(ACTIVE_SEED_REGISTRY_KEY, this.layout.seed);
    this.scene.restart({ seed: this.layout.seed, entry: "restart" });
  }

  private generateNewDungeon(): void {
    if (this.isTransitioning || !this.layout) return;
    this.isTransitioning = true;
    this.combat?.stopTerminal();
    this.enemies?.stopAll();
    this.loot?.freeze();
    this.upgradeOverlay?.destroy();
    this.interactionPrompt?.setText(null);
    const seed = createFriendlySeed(this.layout.seed);
    this.registry.set(ACTIVE_SEED_REGISTRY_KEY, seed);
    replaceSeedInUrl(seed);
    this.scene.restart({ seed, entry: "new" });
  }

  private cleanUpInput(): void {
    this.interactionKey?.off("down", this.handleInteractionDown, this);
    this.interactionKey?.off("up", this.handleInteractionUp, this);
    this.restartKey?.off("down", this.handleActiveRestart, this);
    this.newDungeonKey?.off("down", this.handleActiveNewDungeon, this);
    this.attackSpaceKey?.off("down", this.handleSpaceAttackDown, this);
    this.attackSpaceKey?.off("up", this.handleSpaceAttackUp, this);
    this.attackJKey?.off("down", this.handleJAttackDown, this);
    this.attackJKey?.off("up", this.handleJAttackUp, this);
    this.dashKey?.off("down", this.handleDashDown, this);
    this.dashKey?.off("up", this.handleDashUp, this);
    this.input.off("pointerdown", this.handlePointerAttack, this);
    this.cursors = undefined;
    this.wasd = undefined;
    this.interactionKey = undefined;
    this.restartKey = undefined;
    this.newDungeonKey = undefined;
    this.attackSpaceKey = undefined;
    this.attackJKey = undefined;
    this.dashKey = undefined;
    this.isInteractionHeld = false;
    this.isSpaceAttackHeld = false;
    this.isJAttackHeld = false;
    this.isDashHeld = false;
  }

  private readMovementInput(): MovementInput {
    return {
      up: this.cursors?.up.isDown === true || this.wasd?.up.isDown === true,
      down: this.cursors?.down.isDown === true || this.wasd?.down.isDown === true,
      left: this.cursors?.left.isDown === true || this.wasd?.left.isDown === true,
      right: this.cursors?.right.isDown === true || this.wasd?.right.isDown === true,
    };
  }

  private updateDiscovery(): void {
    if (!this.player || !this.layout || !this.discovery) return;
    const tileX = Math.floor(this.player.x / this.layout.tileSize);
    const tileY = Math.floor(this.player.y / this.layout.tileSize);
    const currentTileIndex = tileIndex(tileX, tileY, this.layout.mapWidth);
    if (currentTileIndex === this.lastPlayerTileIndex) return;
    this.lastPlayerTileIndex = currentTileIndex;

    const nextDiscovery = updateRoomDiscovery(this.discovery, this.layout.rooms, tileX, tileY);
    if (nextDiscovery === this.discovery) return;
    this.discovery = nextDiscovery;
    this.updateMinimap();
    this.hud?.updateDiscovered(nextDiscovery.discoveredRoomIds.size, this.layout.rooms.length);
  }

  private updateInteractionPrompt(): void {
    const target = this.combat?.canInteract() === true ? this.currentInteractionTarget() : null;
    const text =
      target?.type === "key"
        ? "E  ·  TAKE RUNIC KEY"
        : target?.type === "gate"
          ? this.objectiveState.status === "seeking-key"
            ? "E  ·  INSPECT SEALED GATE"
            : "E  ·  OPEN ANCIENT GATE"
          : target?.type === "chest"
            ? "E  ·  OPEN TREASURE CHEST"
            : target?.type === "forge"
              ? this.loot?.getState().forge.status === "ready"
                ? "E  ·  AWAKEN RUNEFORGE"
                : "E  ·  INSPECT RUNEFORGE"
              : null;
    this.interactionPrompt?.setText(text);
  }

  private updateObjectivePresentation(): void {
    this.hud?.updateObjective(this.objectiveState);
    this.updateMinimap();
    this.updateInteractionPrompt();
  }

  private updateMinimap(): void {
    if (!this.discovery || !this.enemies || !this.loot) return;
    this.minimap?.update(
      this.discovery,
      this.objectiveState,
      this.enemies.getAliveEnemyIds(),
      this.loot.getState(),
    );
  }

  private announceFloorStart(entry: GameSceneData["entry"]): void {
    if (entry === "restart") {
      announceGameState(
        "Floor restarted with the same seed. Loot and run upgrades reset. Find the Runic Key.",
      );
      return;
    }
    if (entry === "new") {
      announceGameState(
        "New dungeon generated with fresh treasure and forge offers. Find the Runic Key and escape.",
      );
      return;
    }
    announceGameState(
      "Generated dungeon ready. Find the Runic Key. Enemies and Treasure Chests yield Runic Shards; Vitality Flasks heal; return to the Runeforge for upgrades.",
    );
  }
}
