import Phaser from "phaser";

import { getAudioDirector, type AudioDirector } from "../audio/AudioDirector";
import { CombatController } from "../combat/CombatController";
import { transitionRunOutcome } from "../combat/runOutcome";
import type { RunOutcome } from "../combat/types";
import { SCENE_KEYS } from "../constants";
import {
  createRoomDiscovery,
  updateRoomDiscovery,
  type RoomDiscoveryState,
} from "../dungeon/discovery";
import { isWalkableWorldPoint, tileIndex } from "../dungeon/navigation";
import {
  ACTIVE_SEED_REGISTRY_KEY,
  createFriendlySeed,
  replaceSeedInUrl,
} from "../dungeon/seedSession";
import type { DungeonLayout } from "../dungeon/types";
import { EnemyManager, type EnemySummary } from "../enemies/EnemyManager";
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
import { LootManager } from "../loot/runtime/LootManager";
import type { RunRewardState } from "../loot/rewardState";
import type { LootPlan } from "../loot/types";
import { OBJECTIVE_CONFIG } from "../objective/config";
import {
  createInitialObjectiveState,
  objectiveHasKey,
  reduceObjectiveState,
} from "../objective/objectiveState";
import type { EscapeObjectivePlan, EscapeObjectiveState } from "../objective/types";
import { DungeonRenderer } from "../rendering/DungeonRenderer";
import { createRunPlan } from "../run/createRunPlan";
import {
  advanceFloorCheckpoint,
  commitFloorSummary,
  createFloorSummary,
  createInitialRunSession,
  createRunCarryState,
  safeTimerDelta,
} from "../run/session";
import type {
  ActiveRunActivity,
  CurrentFloorStatistics,
  FloorEntryCheckpoint,
  FloorNumber,
  FloorPlanBundle,
  FloorSummary,
  RunPlan,
  RunStatistics,
} from "../run/types";
import { announceGameState } from "../ui/announce";
import { DungeonHud } from "../ui/DungeonHud";
import { DungeonMinimap } from "../ui/DungeonMinimap";
import { FloorClearedOverlay } from "../ui/FloorClearedOverlay";
import { InteractionPrompt } from "../ui/InteractionPrompt";
import { ObjectiveToast } from "../ui/ObjectiveToast";
import { RunDefeatOverlay } from "../ui/RunDefeatOverlay";
import { RunVictoryOverlay } from "../ui/RunVictoryOverlay";
import { UpgradeChoiceOverlay } from "../ui/UpgradeChoiceOverlay";
import { transitionActiveRunActivity } from "../upgrades/activityState";
import { getUpgrade } from "../upgrades/catalog";
import { deriveEffectivePlayerStats } from "../upgrades/effectiveStats";
import type { UpgradeId } from "../upgrades/types";
import { EffectPool } from "../effects/EffectPool";
import { shouldRequestAutomaticPause } from "../presentation/focusPause";
import { requestGameFullscreen } from "../presentation/fullscreen";
import {
  NO_PRESENTATION_MODAL,
  transitionPresentationModal,
  type PresentationModal,
} from "../presentation/modalState";
import { isLowHealth } from "../presentation/motion";
import {
  getPresentationRuntime,
  type PresentationRuntime,
} from "../presentation/PresentationRuntime";
import {
  DEFAULT_PRESENTATION_SETTINGS,
  effectiveScreenShake,
  type PresentationSettings,
} from "../presentation/settings";
import { FieldManualOverlay } from "../ui/FieldManualOverlay";
import { FloorIntro } from "../ui/FloorIntro";
import { LowHealthOverlay } from "../ui/LowHealthOverlay";
import { PauseOverlay } from "../ui/PauseOverlay";
import { SettingsOverlay } from "../ui/SettingsOverlay";

interface MovementKeys {
  readonly up: Phaser.Input.Keyboard.Key;
  readonly down: Phaser.Input.Keyboard.Key;
  readonly left: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
}

interface GameSceneData {
  readonly seed?: string;
  readonly runPlan?: RunPlan;
  readonly floorNumber?: FloorNumber;
  readonly checkpoint?: FloorEntryCheckpoint;
  readonly entry?: "current-replay" | "next-floor" | "full-replay" | "new-run";
}

interface FloorPlanSnapshot {
  readonly floorNumber: FloorNumber;
  readonly floorSeed: string;
  readonly layoutFingerprint: string;
  readonly objectiveFingerprint: string;
  readonly encounterFingerprint: string;
  readonly lootFingerprint: string;
}

export interface GameSceneSnapshot {
  readonly playerPosition: { readonly x: number; readonly y: number };
  readonly spawnPosition: { readonly x: number; readonly y: number };
  readonly seed: string;
  readonly runSeed: string;
  readonly runFingerprint: string;
  readonly floorCount: number;
  readonly currentFloorNumber: FloorNumber;
  readonly currentFloorSeed: string;
  readonly currentFloorName: string;
  readonly currentFloorThemeId: string;
  readonly currentFloorDifficultyId: string;
  readonly floorPlans: readonly FloorPlanSnapshot[];
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
  readonly floorTimeMs: number;
  readonly runTimeMs: number;
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
  readonly runActivity: ActiveRunActivity;
  readonly activeEnemyProjectileCount: number;
  readonly defeatOverlayVisible: boolean;
  readonly completionOverlayVisible: boolean;
  readonly floorClearedOverlayVisible: boolean;
  readonly runVictoryOverlayVisible: boolean;
  readonly runDefeatOverlayVisible: boolean;
  readonly threatRoomCount: number;
  readonly enemies: readonly EnemySummary[];
  readonly effectiveEnemyDifficulty: FloorPlanBundle["difficulty"];
  readonly forgeRoomId: number;
  readonly forgePosition: { readonly x: number; readonly y: number };
  readonly forgeState: string;
  readonly availableShardCount: number;
  readonly totalCollectedShardCount: number;
  readonly currentForgeCost: number | null;
  readonly forgeUpgradesCompleted: number;
  readonly currentFloorForgePurchases: number;
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
  readonly effectiveMovementMultiplier: number;
  readonly effectiveHitStunDuration: number;
  readonly effectivePlayerKnockbackDuration: number;
  readonly totalChestCount: number;
  readonly openedChestCount: number;
  readonly chests: ReturnType<LootManager["getChestSummaries"]>;
  readonly pickups: ReturnType<LootManager["getPickupSummaries"]>;
  readonly flaskConsumptionCount: number;
  readonly enemyRewards: LootPlan["enemyRewards"];
  readonly checkpoint: FloorEntryCheckpoint;
  readonly cumulativeStatistics: RunStatistics;
  readonly currentFloorStatistics: CurrentFloorStatistics;
  readonly completedFloorSummaries: readonly FloorSummary[];
  readonly presentationSettings: PresentationSettings;
  readonly effectiveReducedMotion: boolean;
  readonly effectiveScreenShake: boolean;
  readonly highContrast: boolean;
  readonly largeText: boolean;
  readonly presentationModalKind: PresentationModal["kind"];
  readonly pauseOverlayVisible: boolean;
  readonly settingsOverlayVisible: boolean;
  readonly fieldManualVisible: boolean;
  readonly firstRunOnboardingActive: boolean;
  readonly onboardingComplete: boolean;
  readonly simulationPaused: boolean;
  readonly physicsPaused: boolean;
  readonly floorTimerPaused: boolean;
  readonly runTimerPaused: boolean;
  readonly audioSupported: boolean;
  readonly audioUnlocked: boolean;
  readonly audioMuted: boolean;
  readonly currentAmbienceId: string | null;
  readonly activeAmbienceCount: number;
  readonly activeEffectVoiceCount: number;
  readonly peakEffectVoiceCount: number;
  readonly activeTransientEffectCount: number;
  readonly peakTransientEffectCount: number;
  readonly lowHealthPresentationVisible: boolean;
  readonly enemyHealthBarVisibleCount: number;
}

export class GameScene extends Phaser.Scene {
  private runPlan?: RunPlan;
  private floor?: FloorPlanBundle;
  private checkpoint?: FloorEntryCheckpoint;
  private layout?: DungeonLayout;
  private objectivePlan?: EscapeObjectivePlan;
  private encounterPlan?: EncounterPlan;
  private lootPlan?: LootPlan;
  private objectiveState: EscapeObjectiveState = createInitialObjectiveState();
  private runOutcome: RunOutcome = "active";
  private runActivity: ActiveRunActivity = "playing";
  private cumulativeStats?: RunStatistics;
  private completedFloors: readonly FloorSummary[] = [];
  private provisionalSummary?: FloorSummary;
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
  private floorClearedOverlay?: FloorClearedOverlay;
  private victoryOverlay?: RunVictoryOverlay;
  private defeatOverlay?: RunDefeatOverlay;
  private upgradeOverlay?: UpgradeChoiceOverlay;
  private pauseOverlay?: PauseOverlay;
  private settingsOverlay?: SettingsOverlay;
  private fieldManual?: FieldManualOverlay;
  private floorIntro?: FloorIntro;
  private lowHealthOverlay?: LowHealthOverlay;
  private effects?: EffectPool;
  private presentation?: PresentationRuntime;
  private audio?: AudioDirector;
  private presentationModal: PresentationModal = NO_PRESENTATION_MODAL;
  private settingsUnsubscribe?: () => void;
  private firstRunOnboardingActive = false;
  private lowHealthVisible = false;
  private muteHeld = false;
  private fullscreenHeld = false;
  private pauseHeld = false;
  private readonly handleWindowBlur = (): void => this.requestAutomaticPause();
  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") this.requestAutomaticPause();
  };
  private lastPlayerTileIndex = -1;
  private floorElapsedTimeMs = 0;
  private runElapsedTimeMs = 0;
  private damageAcceptedThisFloor = 0;
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
    this.presentation = getPresentationRuntime(this);
    this.audio = getAudioDirector(this);
    const registrySeed = this.registry.get(ACTIVE_SEED_REGISTRY_KEY) as unknown;
    const requestedSeed =
      data.seed ?? (typeof registrySeed === "string" ? registrySeed : createFriendlySeed());

    try {
      this.runPlan = data.runPlan ?? createRunPlan(requestedSeed);
      const initialSession = createInitialRunSession(this.runPlan);
      this.checkpoint = data.checkpoint ?? initialSession.floorEntryCheckpoint;
      const floorNumber = data.floorNumber ?? this.checkpoint.floorNumber;
      if (this.checkpoint.floorNumber !== floorNumber) {
        throw new Error("Floor entry checkpoint does not match the requested floor.");
      }
      this.floor = this.runPlan.floors[floorNumber - 1];
      if (!this.floor) throw new Error(`RunPlan has no Floor ${floorNumber}.`);
      this.layout = this.floor.layout;
      this.objectivePlan = this.floor.objective;
      this.encounterPlan = this.floor.encounter;
      this.lootPlan = this.floor.loot;
      this.cumulativeStats = this.checkpoint.cumulativeStats;
      this.completedFloors = this.checkpoint.completedFloors;
      this.runElapsedTimeMs = this.checkpoint.runElapsedMs;
    } catch (error) {
      console.error("Phase 6 run planning failed safely.", error);
      announceGameState("Run planning failed safely. Return to the menu and try a new seed.");
      this.scene.start(SCENE_KEYS.MENU);
      return;
    }

    this.registry.set(ACTIVE_SEED_REGISTRY_KEY, this.runPlan.runSeed);
    replaceSeedInUrl(this.runPlan.runSeed);
    this.physics.world.setBounds(0, 0, this.layout.worldWidth, this.layout.worldHeight);

    const renderer = new DungeonRenderer(this, this.layout, this.floor.theme);
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
        enemyAwakened: (enemyId) => this.handleEnemyAwakened(enemyId),
        enemyHit: () => this.audio?.playEffect("enemy-hit"),
        wardenWallImpact: () => this.shakeCamera(70, 0.003),
        highContrast: () => this.presentation?.getSettings().highContrast === true,
      },
      this.floor.difficulty,
    );
    const initialStats = deriveEffectivePlayerStats(this.checkpoint.carry.selectedUpgradeIds);
    this.combat = new CombatController(
      this,
      this.player,
      this.enemies,
      {
        healthChanged: (vitality) => {
          this.hud?.updateHealth(vitality);
          this.updateLowHealthPresentation(vitality);
        },
        playerDefeated: () => this.defeatRun(),
        attackStarted: () => this.audio?.playEffect("sword-swing"),
        dashStarted: () => this.audio?.playEffect("dash"),
        playerHit: () => this.audio?.playEffect("player-hit", true),
        screenShakeEnabled: () =>
          effectiveScreenShake(this.presentation?.getSettings() ?? DEFAULT_PRESENTATION_SETTINGS),
        reducedMotion: () => this.presentation?.getSettings().reducedMotion === true,
      },
      { effectiveStats: initialStats, currentHealth: this.checkpoint.carry.currentHealth },
    );
    this.loot = new LootManager(
      this,
      this.layout,
      this.lootPlan,
      {
        stateChanged: (state, becameReady) => this.handleRewardStateChanged(state, becameReady),
        chestOpened: () => {
          this.audio?.playEffect("chest-open");
          this.objectiveToast?.show("TREASURE CHEST OPENED", "Its runes spill onto the floor.");
          announceGameState("Treasure Chest opened.");
        },
        healPlayer: (amount) => this.combat?.heal(amount) ?? this.unavailableHealing(),
        healed: (vitality, restoredHealth) => {
          this.audio?.playEffect("flask-heal");
          this.objectiveToast?.show(
            "VITALITY RESTORED",
            `${restoredHealth} health restored. ${vitality.health} / ${vitality.maximumHealth}`,
          );
          announceGameState(
            `Vitality Flask restored ${restoredHealth} health. ${vitality.health} health remaining.`,
          );
        },
        shardCollected: () => this.audio?.playEffect("shard-collected"),
      },
      {
        floorNumber: this.floor.floorNumber,
        carry: {
          availableShards: this.checkpoint.carry.availableShards,
          totalCollectedShards: this.checkpoint.carry.totalCollectedShards,
          selectedUpgradeIds: this.checkpoint.carry.selectedUpgradeIds,
        },
      },
    );

    this.hud = new DungeonHud(this, this.layout, this.encounterPlan.enemies.length, {
      floorNumber: this.floor.floorNumber,
      floorName: this.floor.theme.name,
      runSeed: this.runPlan.runSeed,
      accentColor: this.floor.theme.hudAccentColor,
      highContrast: this.presentation.getSettings().highContrast,
      largeText: this.presentation.getSettings().largeText,
    });
    this.hud.updateObjective(this.objectiveState);
    this.hud.updateTimer(0, this.runElapsedTimeMs);
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
      this.floor.theme,
      this.presentation.getSettings().highContrast,
    );
    this.minimap.update(
      this.discovery,
      this.objectiveState,
      this.enemies.getAliveEnemyIds(),
      this.loot.getState(),
    );
    this.interactionPrompt = new InteractionPrompt(this);
    this.objectiveToast = new ObjectiveToast(this);
    const presentationSettings = this.presentation.getSettings();
    this.effects = new EffectPool(this, presentationSettings.reducedMotion);
    this.lowHealthOverlay = new LowHealthOverlay(this);
    this.updateLowHealthPresentation(this.combat.getVitality(), false);
    this.settingsUnsubscribe = this.presentation.subscribe((settings) => {
      this.effects?.setReducedMotion(settings.reducedMotion);
      this.hud?.applyPresentation(settings.highContrast, settings.largeText);
      this.minimap?.setHighContrast(settings.highContrast);
      this.interactionPrompt?.applyPresentation(settings.highContrast, settings.largeText);
      this.updateMinimap();
      const vitality = this.combat?.getVitality();
      if (vitality) this.updateLowHealthPresentation(vitality, false);
    });
    this.interactionPrompt.applyPresentation(
      presentationSettings.highContrast,
      presentationSettings.largeText,
    );
    this.audio.setFloorAmbience(this.floor.floorNumber);

    this.configureCamera();
    this.registerInput();
    this.lastPlayerTileIndex = tileIndex(
      this.layout.spawn.tileX,
      this.layout.spawn.tileY,
      this.layout.mapWidth,
    );
    this.floorIntro = new FloorIntro(
      this,
      this.floor.floorNumber,
      this.floor.theme.name,
      presentationSettings.reducedMotion,
    );
    this.announceFloorStart(data.entry);
    if (this.presentation.needsOnboarding()) this.openFirstRunOnboarding();
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
    if (
      this.runOutcome !== "active" ||
      this.runActivity !== "playing" ||
      this.presentationModal.kind !== "none" ||
      this.isTransitioning
    ) {
      return;
    }

    const timerDelta = safeTimerDelta(delta);
    this.floorElapsedTimeMs += timerDelta;
    this.runElapsedTimeMs += timerDelta;
    this.hud?.updateTimer(this.floorElapsedTimeMs, this.runElapsedTimeMs);
    this.combat.update(delta, this.readMovementInput());
    this.hud?.updateDash(this.combat.getDashState());
    this.updateDiscovery();
    this.enemies.update(delta, this.discovery);
    this.loot.update(this.player);
    this.updateInteractionPrompt();
  }

  public getTestSnapshot(): GameSceneSnapshot | null {
    if (
      !this.player ||
      !this.runPlan ||
      !this.floor ||
      !this.checkpoint ||
      !this.cumulativeStats ||
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
    const vitality = this.combat.getVitality();
    const attack = this.combat.getAttackState();
    const dash = this.combat.getDashState();
    const aliveEnemyIds = this.enemies.getAliveEnemyIds();
    const rewardState = this.loot.getState();
    const effectiveStats = this.combat.getEffectiveStats();
    const activeOffer = rewardState.forge.status === "choosing" ? rewardState.forge.offer : null;
    const settings = this.presentation?.getSettings() ?? DEFAULT_PRESENTATION_SETTINGS;
    const audio = this.audio?.getSnapshot() ?? {
      supported: false,
      unlocked: false,
      muted: settings.muted,
      currentAmbienceId: null,
      activeAmbienceCount: 0,
      activeEffectVoiceCount: 0,
      peakEffectVoiceCount: 0,
    };
    const simulationPaused = this.presentationModal.kind !== "none";

    return {
      playerPosition: { x: this.player.x, y: this.player.y },
      spawnPosition: { x: spawnPoint.x, y: spawnPoint.y },
      seed: this.runPlan.runSeed,
      runSeed: this.runPlan.runSeed,
      runFingerprint: this.runPlan.fingerprint,
      floorCount: this.runPlan.floors.length,
      currentFloorNumber: this.floor.floorNumber,
      currentFloorSeed: this.floor.floorSeed,
      currentFloorName: this.floor.theme.name,
      currentFloorThemeId: this.floor.theme.id,
      currentFloorDifficultyId: this.floor.difficulty.id,
      floorPlans: this.runPlan.floors.map((floor) => ({
        floorNumber: floor.floorNumber,
        floorSeed: floor.floorSeed,
        layoutFingerprint: floor.layout.fingerprint,
        objectiveFingerprint: floor.objective.fingerprint,
        encounterFingerprint: floor.encounter.fingerprint,
        lootFingerprint: floor.loot.fingerprint,
      })),
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
      floorComplete: this.runActivity === "floor-cleared" || this.runOutcome === "escaped",
      movementEnabled:
        this.runOutcome === "active" &&
        this.runActivity === "playing" &&
        this.presentationModal.kind === "none" &&
        !this.isTransitioning,
      interactionPrompt: this.interactionPrompt?.getText() ?? null,
      elapsedTimeMs: this.floorElapsedTimeMs,
      floorTimeMs: this.floorElapsedTimeMs,
      runTimeMs: this.runElapsedTimeMs,
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
      runActivity: this.runActivity,
      activeEnemyProjectileCount: this.enemies.getActiveProjectileCount(),
      defeatOverlayVisible: this.defeatOverlay !== undefined,
      completionOverlayVisible:
        this.floorClearedOverlay !== undefined || this.victoryOverlay !== undefined,
      floorClearedOverlayVisible: this.floorClearedOverlay !== undefined,
      runVictoryOverlayVisible: this.victoryOverlay !== undefined,
      runDefeatOverlayVisible: this.defeatOverlay !== undefined,
      threatRoomCount: deriveThreatRoomIds(this.discovery, this.encounterPlan, aliveEnemyIds)
        .length,
      enemies: this.enemies.getSummaries(),
      effectiveEnemyDifficulty: this.floor.difficulty,
      forgeRoomId: this.lootPlan.forge.roomId,
      forgePosition: { x: this.lootPlan.forge.position.x, y: this.lootPlan.forge.position.y },
      forgeState: rewardState.forge.status,
      availableShardCount: rewardState.availableShards,
      totalCollectedShardCount: rewardState.totalCollectedShards,
      currentForgeCost: rewardState.forge.cost,
      forgeUpgradesCompleted: rewardState.forgePurchasesThisFloor,
      currentFloorForgePurchases: rewardState.forgePurchasesThisFloor,
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
      effectiveMovementMultiplier: effectiveStats.movementSpeedMultiplier,
      effectiveHitStunDuration: effectiveStats.hitStunMs,
      effectivePlayerKnockbackDuration: effectiveStats.playerKnockbackMs,
      totalChestCount: this.lootPlan.chests.length,
      openedChestCount: rewardState.openedChestIds.size,
      chests: this.loot.getChestSummaries(),
      pickups: this.loot.getPickupSummaries(),
      flaskConsumptionCount: rewardState.flasksConsumed,
      enemyRewards: this.lootPlan.enemyRewards,
      checkpoint: this.checkpoint,
      cumulativeStatistics: this.cumulativeStats,
      currentFloorStatistics: this.getCurrentFloorStatistics(),
      completedFloorSummaries: this.completedFloors,
      presentationSettings: settings,
      effectiveReducedMotion: settings.reducedMotion,
      effectiveScreenShake: effectiveScreenShake(settings),
      highContrast: settings.highContrast,
      largeText: settings.largeText,
      presentationModalKind: this.presentationModal.kind,
      pauseOverlayVisible: this.pauseOverlay !== undefined,
      settingsOverlayVisible: this.settingsOverlay !== undefined,
      fieldManualVisible: this.fieldManual !== undefined,
      firstRunOnboardingActive: this.firstRunOnboardingActive,
      onboardingComplete: this.presentation?.needsOnboarding() === false,
      simulationPaused,
      physicsPaused: this.physics.world.isPaused,
      floorTimerPaused:
        simulationPaused || this.runActivity !== "playing" || this.runOutcome !== "active",
      runTimerPaused:
        simulationPaused || this.runActivity !== "playing" || this.runOutcome !== "active",
      audioSupported: audio.supported,
      audioUnlocked: audio.unlocked,
      audioMuted: audio.muted,
      currentAmbienceId: audio.currentAmbienceId,
      activeAmbienceCount: audio.activeAmbienceCount,
      activeEffectVoiceCount: audio.activeEffectVoiceCount,
      peakEffectVoiceCount: audio.peakEffectVoiceCount,
      activeTransientEffectCount: this.effects?.getActiveCount() ?? 0,
      peakTransientEffectCount: this.effects?.getPeakCount() ?? 0,
      lowHealthPresentationVisible: this.lowHealthVisible,
      enemyHealthBarVisibleCount: this.enemies.getVisibleHealthBarCount(),
    };
  }

  private unavailableHealing(): Readonly<{
    consumed: boolean;
    restoredHealth: number;
    vitality: ReturnType<CombatController["getVitality"]>;
  }> {
    const vitality = this.combat?.getVitality();
    if (vitality) return Object.freeze({ consumed: false, restoredHealth: 0, vitality });
    return Object.freeze({
      consumed: false,
      restoredHealth: 0,
      vitality: Object.freeze({ status: "defeated" as const, health: 0, maximumHealth: 5 }),
    });
  }

  private resetRuntimeState(): void {
    this.objectiveState = createInitialObjectiveState();
    this.runOutcome = "active";
    this.runActivity = "playing";
    this.floorElapsedTimeMs = 0;
    this.runElapsedTimeMs = 0;
    this.damageAcceptedThisFloor = 0;
    this.lastPlayerTileIndex = -1;
    this.isTransitioning = false;
    this.isInteractionHeld = false;
    this.isSpaceAttackHeld = false;
    this.isJAttackHeld = false;
    this.isDashHeld = false;
    this.muteHeld = false;
    this.fullscreenHeld = false;
    this.pauseHeld = false;
    this.presentationModal = NO_PRESENTATION_MODAL;
    this.firstRunOnboardingActive = false;
    this.lowHealthVisible = false;
    this.completedFloors = [];
    this.provisionalSummary = undefined;
    this.floorClearedOverlay = undefined;
    this.victoryOverlay = undefined;
    this.defeatOverlay = undefined;
    this.upgradeOverlay = undefined;
    this.pauseOverlay = undefined;
    this.settingsOverlay = undefined;
    this.fieldManual = undefined;
    this.floorIntro = undefined;
    this.lowHealthOverlay = undefined;
    this.effects = undefined;
    this.settingsUnsubscribe = undefined;
  }

  private configureCamera(): void {
    if (!this.player || !this.layout || !this.floor) return;
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.layout.worldWidth, this.layout.worldHeight);
    camera.setBackgroundColor(this.floor.theme.voidColor);
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
    keyboard.on("keydown-ESC", this.handlePauseDown, this);
    keyboard.on("keyup-ESC", this.handlePauseUp, this);
    keyboard.on("keydown-H", this.handleManualShortcut, this);
    keyboard.on("keydown-M", this.handleMuteDown, this);
    keyboard.on("keyup-M", this.handleMuteUp, this);
    keyboard.on("keydown-F", this.handleFullscreenDown, this);
    keyboard.on("keyup-F", this.handleFullscreenUp, this);
    this.input.on("pointerdown", this.handlePointerAttack, this);
    window.addEventListener("blur", this.handleWindowBlur);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
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
    if (
      this.runOutcome === "active" &&
      this.runActivity === "playing" &&
      this.presentationModal.kind === "none" &&
      !this.isTransitioning
    ) {
      this.combat?.beginDash(this.readMovementInput());
    }
  }

  private handleDashUp(): void {
    this.isDashHeld = false;
  }

  private handlePauseDown(): void {
    if (this.pauseHeld) return;
    this.pauseHeld = true;
    if (this.presentationModal.kind === "none") this.openPause();
  }

  private handlePauseUp(): void {
    this.pauseHeld = false;
  }

  private handleManualShortcut(): void {
    if (this.presentationModal.kind !== "none") return;
    this.openManualFromGame();
  }

  private handleMuteDown(): void {
    if (this.muteHeld || this.presentationModal.kind === "pause") return;
    this.muteHeld = true;
    this.toggleMute();
  }

  private handleMuteUp(): void {
    this.muteHeld = false;
  }

  private handleFullscreenDown(): void {
    if (this.fullscreenHeld || this.presentationModal.kind === "pause") return;
    this.fullscreenHeld = true;
    void this.toggleFullscreen();
  }

  private handleFullscreenUp(): void {
    this.fullscreenHeld = false;
  }

  private handlePointerAttack(pointer: Phaser.Input.Pointer): void {
    if (
      pointer.button !== 0 ||
      this.runOutcome !== "active" ||
      this.runActivity !== "playing" ||
      this.presentationModal.kind !== "none" ||
      this.isTransitioning
    ) {
      return;
    }
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.combat?.beginPointerAttack(worldPoint);
  }

  private handleActiveRestart(): void {
    if (this.runOutcome !== "active" || this.presentationModal.kind !== "none") return;
    this.replayCurrentFloor();
  }

  private handleActiveNewDungeon(): void {
    if (this.runOutcome !== "active" || this.presentationModal.kind !== "none") return;
    this.generateNewRun();
  }

  private attack(): void {
    if (
      this.runOutcome !== "active" ||
      this.runActivity !== "playing" ||
      this.presentationModal.kind !== "none" ||
      this.isTransitioning
    )
      return;
    this.combat?.beginFacingAttack();
  }

  private interact(): void {
    if (
      !this.player ||
      this.runOutcome !== "active" ||
      this.runActivity !== "playing" ||
      this.presentationModal.kind !== "none" ||
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
      this.runActivity !== "playing" ||
      this.presentationModal.kind !== "none"
    ) {
      return null;
    }
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

  private openFirstRunOnboarding(): void {
    if (!this.presentation || this.presentationModal.kind !== "none") return;
    const next = transitionPresentationModal(
      this.presentationModal,
      { type: "open-manual", returnTo: "game" },
      { outcome: this.runOutcome, activity: this.runActivity },
    );
    if (next === this.presentationModal) return;
    this.presentationModal = next;
    this.firstRunOnboardingActive = true;
    this.suspendForPresentation();
    this.createFieldManual(true);
    announceGameState(
      "First-run onboarding opened. Four Field Manual sections introduce the descent.",
    );
  }

  private openPause(): void {
    const next = transitionPresentationModal(
      this.presentationModal,
      { type: "open-pause" },
      { outcome: this.runOutcome, activity: this.runActivity },
    );
    if (next === this.presentationModal) return;
    this.presentationModal = next;
    this.suspendForPresentation();
    this.showPauseOverlay();
    announceGameState("Run paused.");
  }

  private requestAutomaticPause(): void {
    if (
      !shouldRequestAutomaticPause(this.runOutcome, this.runActivity, this.presentationModal.kind)
    ) {
      return;
    }
    this.openPause();
  }

  private showPauseOverlay(): void {
    if (
      this.presentationModal.kind !== "pause" ||
      this.pauseOverlay ||
      !this.floor ||
      !this.runPlan ||
      !this.combat ||
      !this.loot ||
      !this.presentation
    ) {
      return;
    }
    const vitality = this.combat.getVitality();
    this.pauseOverlay = new PauseOverlay(
      this,
      {
        floorNumber: this.floor.floorNumber,
        floorName: this.floor.theme.name,
        runSeed: this.runPlan.runSeed,
        health: `${vitality.health} / ${vitality.maximumHealth}`,
        buildCount: this.loot.getState().selectedUpgradeIds.length,
      },
      this.presentation.getSettings(),
      {
        resume: () => {
          this.pauseOverlay = undefined;
          this.resumeFromPause();
        },
        manual: () => {
          this.pauseOverlay = undefined;
          this.openManualFromPause();
        },
        settings: () => {
          this.pauseOverlay = undefined;
          this.openSettingsFromPause();
        },
        replay: () => this.replayCurrentFloor(),
        newRun: () => this.generateNewRun(),
        fullscreen: () => void this.toggleFullscreen(),
        mute: () => this.toggleMute(),
      },
    );
  }

  private resumeFromPause(): void {
    if (this.presentationModal.kind !== "pause") return;
    this.presentationModal = transitionPresentationModal(
      this.presentationModal,
      { type: "resume" },
      { outcome: this.runOutcome, activity: this.runActivity },
    );
    this.resumeFromPresentation();
    announceGameState("Run resumed.");
  }

  private openManualFromGame(): void {
    if (this.runOutcome !== "active" || this.runActivity !== "playing") return;
    const next = transitionPresentationModal(
      this.presentationModal,
      { type: "open-manual", returnTo: "game" },
      { outcome: this.runOutcome, activity: this.runActivity },
    );
    if (next === this.presentationModal) return;
    this.presentationModal = next;
    this.suspendForPresentation();
    this.createFieldManual(false);
    announceGameState("Field Manual opened. Gameplay is paused.");
  }

  private openManualFromPause(): void {
    const next = transitionPresentationModal(
      this.presentationModal,
      { type: "open-manual", returnTo: "pause" },
      { outcome: this.runOutcome, activity: this.runActivity },
    );
    if (next === this.presentationModal) {
      this.showPauseOverlay();
      return;
    }
    this.presentationModal = next;
    this.createFieldManual(false);
    announceGameState("Field Manual opened from Pause.");
  }

  private createFieldManual(onboarding: boolean): void {
    if (!this.presentation || this.fieldManual) return;
    this.fieldManual = new FieldManualOverlay(
      this,
      this.presentation.getSettings(),
      {
        close: () => {
          this.fieldManual = undefined;
          const completedOnboarding = this.firstRunOnboardingActive;
          if (this.firstRunOnboardingActive) {
            this.presentation?.finishOnboarding();
            this.firstRunOnboardingActive = false;
          }
          const returnTo =
            this.presentationModal.kind === "manual" ? this.presentationModal.returnTo : "game";
          this.presentationModal = transitionPresentationModal(
            this.presentationModal,
            { type: "back" },
            { outcome: this.runOutcome, activity: this.runActivity },
          );
          this.audio?.playEffect("ui-back");
          if (returnTo === "pause") this.showPauseOverlay();
          else {
            this.resumeFromPresentation();
            announceGameState(
              completedOnboarding
                ? `Onboarding complete. Floor ${this.floor?.floorNumber ?? 1} begins.`
                : "Field Manual closed. Run resumed.",
            );
          }
        },
        focus: () => this.audio?.playEffect("ui-focus"),
      },
      onboarding,
    );
  }

  private openSettingsFromPause(): void {
    const next = transitionPresentationModal(
      this.presentationModal,
      { type: "open-settings", returnTo: "pause" },
      { outcome: this.runOutcome, activity: this.runActivity },
    );
    if (next === this.presentationModal) {
      this.showPauseOverlay();
      return;
    }
    this.presentationModal = next;
    this.createSettingsOverlay();
    announceGameState("Settings opened from Pause.");
  }

  private createSettingsOverlay(): void {
    if (!this.presentation || this.settingsOverlay) return;
    this.settingsOverlay = new SettingsOverlay(this, this.presentation.getSettings(), {
      change: (key, value) => {
        this.presentation?.update(key, value);
        if (this.presentation)
          this.settingsOverlay?.updateSettings(this.presentation.getSettings());
      },
      resetSettings: () => {
        this.presentation?.resetSettings();
        if (this.presentation)
          this.settingsOverlay?.updateSettings(this.presentation.getSettings());
      },
      resetOnboarding: () => {
        this.presentation?.resetOnboarding();
        announceGameState("First-run onboarding reset.");
      },
      back: () => {
        this.settingsOverlay = undefined;
        this.presentationModal = transitionPresentationModal(
          this.presentationModal,
          { type: "back" },
          { outcome: this.runOutcome, activity: this.runActivity },
        );
        this.audio?.playEffect("ui-back");
        this.showPauseOverlay();
      },
      focus: () => this.audio?.playEffect("ui-focus"),
    });
  }

  private suspendForPresentation(): void {
    this.physics.world.pause();
    this.tweens.pauseAll();
    this.audio?.pause();
    this.interactionPrompt?.setText(null);
  }

  private resumeFromPresentation(): void {
    if (this.presentationModal.kind !== "none" || this.runOutcome !== "active") return;
    this.physics.world.resume();
    this.tweens.resumeAll();
    this.audio?.resume();
    this.updateInteractionPrompt();
  }

  private toggleMute(): void {
    const muted = this.presentation?.toggleMute();
    if (muted === undefined) return;
    announceGameState(muted ? "Audio muted." : "Audio unmuted.");
  }

  private async toggleFullscreen(): Promise<void> {
    this.audio?.unlock();
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        announceGameState("Fullscreen exited.");
      } catch {
        announceGameState("Fullscreen could not be exited.");
      }
      return;
    }
    const frame = document.querySelector<HTMLElement>(".game-frame") ?? undefined;
    const entered = await requestGameFullscreen(frame);
    announceGameState(entered ? "Fullscreen entered." : "Fullscreen is unavailable.");
  }

  private handleEnemyAwakened(enemyId: string): void {
    const enemy = this.enemies?.getSummaries().find((candidate) => candidate.id === enemyId);
    if (!enemy) return;
    this.effects?.burst(enemy.position.x, enemy.position.y, 0xe8c77f, 5);
    announceGameState(`${enemy.archetype.replaceAll("-", " ")} awakens.`);
  }

  private updateLowHealthPresentation(
    vitality: ReturnType<CombatController["getVitality"]>,
    announce = true,
  ): void {
    const visible = isLowHealth(vitality.health, vitality.status);
    const changed = visible !== this.lowHealthVisible;
    this.lowHealthVisible = visible;
    this.lowHealthOverlay?.setState(
      visible,
      this.presentation?.getSettings().reducedMotion === true,
      this.presentation?.getSettings().highContrast === true,
    );
    if (!announce || !changed) return;
    announceGameState(visible ? "Low health." : "Health recovered above the low-health threshold.");
  }

  private shakeCamera(duration: number, intensity: number): void {
    const settings = this.presentation?.getSettings();
    if (!settings || !effectiveScreenShake(settings)) return;
    this.cameras.main.shake(duration, intensity);
  }

  private collectKey(): void {
    const transition = reduceObjectiveState(this.objectiveState, { type: "collect-key" });
    if (transition.outcome !== "key-collected") return;
    this.objectiveState = transition.state;
    this.runicKey?.collect();
    this.ancientGate?.setReady(true);
    this.audio?.playEffect("key-collected");
    this.audio?.playEffect("gate-ready");
    this.effects?.burst(
      this.objectivePlan?.keyPosition.x ?? 0,
      this.objectivePlan?.keyPosition.y ?? 0,
      0xf3cb71,
      8,
    );
    this.updateObjectivePresentation();
    this.objectiveToast?.show("RUNES AWAKENED", "The Ancient Gate can now be opened.");
    announceGameState("Runic Key collected. The Ancient Gate can now be opened.");
  }

  private attemptGate(): void {
    const transition = reduceObjectiveState(this.objectiveState, {
      type: "attempt-gate",
      elapsedTimeMs: this.floorElapsedTimeMs,
    });
    if (transition.outcome === "gate-blocked") {
      this.audio?.playEffect("gate-sealed");
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
    this.audio?.playEffect("ui-confirm");
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
      this.presentation?.getSettings(),
    );
    announceGameState(
      "Runeforge opened. Choose one of three run upgrades, or press Escape to leave.",
    );
  }

  private closeUpgradeOverlay(): void {
    if (this.runOutcome !== "active" || this.runActivity !== "choosing-upgrade") return;
    this.loot?.closeForge();
    this.upgradeOverlay = undefined;
    this.runActivity = transitionActiveRunActivity(this.runActivity, "resume");
    this.enemies?.resume();
    this.updateInteractionPrompt();
  }

  private selectUpgrade(upgradeId: UpgradeId): void {
    if (
      this.runOutcome !== "active" ||
      this.runActivity !== "choosing-upgrade" ||
      !this.loot ||
      !this.combat
    ) {
      return;
    }
    if (!this.loot.selectUpgrade(upgradeId)) return;
    this.audio?.playEffect("upgrade-selected");
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
    this.effects?.burst(this.player?.x ?? 0, this.player?.y ?? 0, 0xc499db, 10);
    announceGameState(`${definition.name} selected. ${definition.description}`);
    this.handleRewardStateChanged(this.loot.getState(), false);
  }

  private closeUpgradeOverlayForTransition(): void {
    if (!this.upgradeOverlay) return;
    this.upgradeOverlay.destroy();
    this.upgradeOverlay = undefined;
    this.loot?.closeForge();
  }

  private completeFloor(): void {
    if (
      !this.floor ||
      !this.combat ||
      this.objectiveState.status !== "completed" ||
      this.runOutcome !== "active" ||
      this.runActivity !== "playing"
    ) {
      return;
    }
    const summary = this.createCurrentFloorSummary();
    this.provisionalSummary = summary;
    this.closeUpgradeOverlayForTransition();
    this.freezeCurrentFloor();
    this.hud?.updateObjective(this.objectiveState);
    this.updateMinimap();
    this.ancientGate?.playCompletion();
    if (this.presentation?.getSettings().reducedMotion !== true) {
      this.cameras.main.flash(OBJECTIVE_CONFIG.completionTransitionMs, 202, 181, 122, false);
    }

    if (this.floor.floorNumber < 3) {
      this.audio?.playEffect("floor-cleared", true);
      this.shakeCamera(120, 0.0025);
      this.runActivity = transitionActiveRunActivity(this.runActivity, "clear-floor");
      announceGameState(`Floor ${this.floor.floorNumber} cleared. Descend when ready.`);
      this.time.delayedCall(OBJECTIVE_CONFIG.completionTransitionMs, () => {
        if (
          this.runOutcome !== "active" ||
          this.runActivity !== "floor-cleared" ||
          this.floorClearedOverlay ||
          !this.provisionalSummary
        ) {
          return;
        }
        this.floorClearedOverlay = new FloorClearedOverlay(
          this,
          { summary: this.provisionalSummary, runElapsedMs: this.runElapsedTimeMs },
          {
            continueRun: () => this.continueToNextFloor(),
            replayFloor: () => this.replayCurrentFloor(),
            newRun: () => this.generateNewRun(),
          },
        );
      });
      return;
    }

    this.runOutcome = transitionRunOutcome(this.runOutcome, "escape");
    this.audio?.playEffect("run-victory", true);
    this.audio?.stopAmbience();
    this.shakeCamera(160, 0.003);
    this.commitFinalFloor(summary);
    announceGameState("Dungeon conquered. The complete three-floor run is won.");
    this.time.delayedCall(OBJECTIVE_CONFIG.completionTransitionMs, () => this.showVictoryOverlay());
  }

  private continueToNextFloor(): void {
    if (
      this.isTransitioning ||
      this.runOutcome !== "active" ||
      this.runActivity !== "floor-cleared" ||
      !this.runPlan ||
      !this.floor ||
      !this.checkpoint ||
      !this.provisionalSummary ||
      !this.combat ||
      !this.loot
    ) {
      return;
    }
    const vitality = this.combat.getVitality();
    if (vitality.status !== "alive") return;
    this.isTransitioning = true;
    const reward = this.loot.getState();
    const carry = createRunCarryState(
      vitality.health,
      reward.availableShards,
      reward.totalCollectedShards,
      reward.selectedUpgradeIds,
    );
    const checkpoint = advanceFloorCheckpoint(
      this.checkpoint,
      this.provisionalSummary,
      carry,
      this.combat.getEffectiveStats().maximumHealth,
      this.runElapsedTimeMs,
    );
    const nextFloorNumber = checkpoint.floorNumber;
    this.stopForSceneTransition();
    announceGameState(
      `Descent restores one health. Floor ${nextFloorNumber} begins: ${this.runPlan.floors[nextFloorNumber - 1]?.theme.name}.`,
    );
    this.scene.restart({
      runPlan: this.runPlan,
      floorNumber: nextFloorNumber,
      checkpoint,
      entry: "next-floor",
    });
  }

  private commitFinalFloor(summary: FloorSummary): void {
    if (!this.cumulativeStats) return;
    const committed = commitFloorSummary(this.cumulativeStats, this.completedFloors, summary);
    this.cumulativeStats = committed.statistics;
    this.completedFloors = committed.completedFloors;
  }

  private showVictoryOverlay(): void {
    if (
      this.runOutcome !== "escaped" ||
      this.victoryOverlay ||
      !this.runPlan ||
      !this.combat ||
      !this.loot ||
      !this.cumulativeStats
    ) {
      return;
    }
    const vitality = this.combat.getVitality();
    const reward = this.loot.getState();
    this.victoryOverlay = new RunVictoryOverlay(
      this,
      {
        runSeed: this.runPlan.runSeed,
        runElapsedMs: this.runElapsedTimeMs,
        summaries: this.completedFloors,
        statistics: this.cumulativeStats,
        finalHealth: vitality.health,
        availableShards: reward.availableShards,
        selectedUpgradeIds: reward.selectedUpgradeIds,
      },
      { replay: () => this.replayWholeRun(), newRun: () => this.generateNewRun() },
    );
  }

  private handlePlayerDamage(source: Readonly<{ x: number; y: number }>): void {
    const outcome = this.combat?.receiveDamage(source) ?? "ignored";
    if (outcome !== "accepted" && outcome !== "defeated") return;
    this.damageAcceptedThisFloor += 1;
    const vitality = this.combat?.getVitality();
    if (vitality) announceGameState(`Player damaged. ${vitality.health} health remaining.`);
  }

  private handleEnemyDefeated(
    details: Readonly<{
      enemyId: string;
      roomId: number;
      position: Readonly<{ x: number; y: number }>;
    }>,
  ): void {
    if (!this.enemies || this.runOutcome !== "active" || this.runActivity !== "playing") return;
    this.loot?.dropEnemyReward(details);
    this.audio?.playEffect("enemy-defeat");
    this.effects?.burst(details.position.x, details.position.y, 0xd68d68, 8);
    this.hud?.updateEnemies(this.enemies.getDefeatedCount(), this.enemies.getTotalCount());
    this.updateMinimap();
  }

  private handleRewardStateChanged(state: RunRewardState, becameReady: boolean): void {
    this.hud?.updateRewards(state, this.lootPlan?.chests.length ?? 0);
    this.updateMinimap();
    if (becameReady) {
      this.audio?.playEffect("forge-ready");
      const cost = state.forge.cost;
      this.objectiveToast?.show(
        "RUNEFORGE READY",
        `Return to the spawn room. ${cost} shards are ready.`,
      );
      announceGameState("The Runeforge is ready. Return to the spawn room for a run upgrade.");
    }
  }

  private defeatRun(): void {
    if (
      this.runOutcome !== "active" ||
      !this.runPlan ||
      !this.floor ||
      !this.cumulativeStats ||
      !this.loot
    ) {
      return;
    }
    this.runOutcome = transitionRunOutcome(this.runOutcome, "defeat");
    this.audio?.playEffect("run-defeat", true);
    this.audio?.stopAmbience();
    this.closeUpgradeOverlayForTransition();
    this.floorClearedOverlay?.destroy();
    this.floorClearedOverlay = undefined;
    this.freezeCurrentFloor();
    if (this.presentation?.getSettings().reducedMotion !== true) {
      this.cameras.main.flash(260, 122, 28, 35, false);
    }
    this.shakeCamera(140, 0.003);
    announceGameState("Fallen in the depths. Replay this run or generate a new run.");
    this.time.delayedCall(360, () => {
      if (
        this.runOutcome !== "defeated" ||
        this.defeatOverlay ||
        !this.runPlan ||
        !this.floor ||
        !this.cumulativeStats ||
        !this.loot
      ) {
        return;
      }
      const rewards = this.loot.getState();
      this.defeatOverlay = new RunDefeatOverlay(
        this,
        {
          runSeed: this.runPlan.runSeed,
          floorNumber: this.floor.floorNumber,
          floorName: this.floor.theme.name,
          runElapsedMs: this.runElapsedTimeMs,
          floorElapsedMs: this.floorElapsedTimeMs,
          completedFloors: this.completedFloors.length,
          cumulative: this.cumulativeStats,
          current: this.getCurrentFloorStatistics(),
          availableShards: rewards.availableShards,
          selectedUpgradeIds: rewards.selectedUpgradeIds,
        },
        { replay: () => this.replayWholeRun(), newRun: () => this.generateNewRun() },
      );
    });
  }

  private replayCurrentFloor(): void {
    if (this.isTransitioning || !this.runPlan || !this.checkpoint) return;
    this.isTransitioning = true;
    const floorNumber = this.checkpoint.floorNumber;
    this.stopForSceneTransition();
    this.scene.restart({
      runPlan: this.runPlan,
      floorNumber,
      checkpoint: this.checkpoint,
      entry: "current-replay",
    });
  }

  private replayWholeRun(): void {
    if (this.isTransitioning || !this.runPlan) return;
    this.isTransitioning = true;
    const checkpoint = createInitialRunSession(this.runPlan).floorEntryCheckpoint;
    this.stopForSceneTransition();
    this.scene.restart({
      runPlan: this.runPlan,
      floorNumber: 1,
      checkpoint,
      entry: "full-replay",
    });
  }

  private generateNewRun(): void {
    if (this.isTransitioning || !this.runPlan) return;
    this.isTransitioning = true;
    const seed = createFriendlySeed(this.runPlan.runSeed);
    this.registry.set(ACTIVE_SEED_REGISTRY_KEY, seed);
    replaceSeedInUrl(seed);
    this.stopForSceneTransition();
    this.scene.restart({ seed, entry: "new-run" });
  }

  private stopForSceneTransition(): void {
    if (this.physics.world.isPaused) this.physics.world.resume();
    this.tweens.resumeAll();
    this.audio?.resume();
    this.presentationModal = transitionPresentationModal(
      this.presentationModal,
      { type: "shutdown" },
      { outcome: this.runOutcome, activity: this.runActivity },
    );
    this.combat?.stopTerminal();
    this.enemies?.stopAll();
    this.loot?.freeze();
    this.upgradeOverlay?.destroy();
    this.floorClearedOverlay?.destroy();
    this.victoryOverlay?.destroy();
    this.defeatOverlay?.destroy();
    this.pauseOverlay?.destroy();
    this.settingsOverlay?.destroy();
    this.fieldManual?.destroy();
    this.floorIntro?.destroy();
    this.pauseOverlay = undefined;
    this.settingsOverlay = undefined;
    this.fieldManual = undefined;
    this.interactionPrompt?.setText(null);
  }

  private freezeCurrentFloor(): void {
    this.combat?.stopTerminal();
    this.enemies?.stopAll();
    this.loot?.freeze();
    this.player?.stopMovement();
    this.interactionPrompt?.setText(null);
  }

  private createCurrentFloorSummary(): FloorSummary {
    if (!this.floor || !this.combat || !this.loot) {
      throw new Error("Cannot summarize an unavailable current floor.");
    }
    const rewards = this.loot.getState();
    const vitality = this.combat.getVitality();
    return createFloorSummary(
      this.floor,
      this.floorElapsedTimeMs,
      vitality.health,
      this.getCurrentFloorStatistics(),
      rewards.availableShards,
      this.getCurrentFloorUpgradeIds(),
      rewards.selectedUpgradeIds,
    );
  }

  private getCurrentFloorUpgradeIds(): readonly UpgradeId[] {
    if (!this.loot || !this.checkpoint) return [];
    const entryIds = new Set(this.checkpoint.carry.selectedUpgradeIds);
    return this.loot.getState().selectedUpgradeIds.filter((id) => !entryIds.has(id));
  }

  private getCurrentFloorStatistics(): CurrentFloorStatistics {
    const reward = this.loot?.getState();
    return Object.freeze({
      enemiesDefeated: this.enemies?.getDefeatedCount() ?? 0,
      roomsDiscovered: this.discovery?.discoveredRoomIds.size ?? 0,
      chestsOpened: reward?.openedChestIds.size ?? 0,
      shardsCollected:
        reward && this.checkpoint
          ? reward.totalCollectedShards - this.checkpoint.carry.totalCollectedShards
          : 0,
      flasksConsumed: reward?.flasksConsumed ?? 0,
      upgradesSelected: this.getCurrentFloorUpgradeIds().length,
      damageAccepted: this.damageAcceptedThisFloor,
    });
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
    const keyboard = this.input.keyboard;
    keyboard?.off("keydown-ESC", this.handlePauseDown, this);
    keyboard?.off("keyup-ESC", this.handlePauseUp, this);
    keyboard?.off("keydown-H", this.handleManualShortcut, this);
    keyboard?.off("keydown-M", this.handleMuteDown, this);
    keyboard?.off("keyup-M", this.handleMuteUp, this);
    keyboard?.off("keydown-F", this.handleFullscreenDown, this);
    keyboard?.off("keyup-F", this.handleFullscreenUp, this);
    this.input.off("pointerdown", this.handlePointerAttack, this);
    window.removeEventListener("blur", this.handleWindowBlur);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.settingsUnsubscribe?.();
    this.settingsUnsubscribe = undefined;
    this.pauseOverlay?.destroy();
    this.settingsOverlay?.destroy();
    this.fieldManual?.destroy();
    this.presentationModal = NO_PRESENTATION_MODAL;
    this.cursors = undefined;
    this.wasd = undefined;
    this.interactionKey = undefined;
    this.restartKey = undefined;
    this.newDungeonKey = undefined;
    this.attackSpaceKey = undefined;
    this.attackJKey = undefined;
    this.dashKey = undefined;
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
    if (!this.floor) return;
    if (entry === "current-replay") {
      announceGameState(
        `Floor ${this.floor.floorNumber} replayed from its entry checkpoint. ${this.floor.theme.name}.`,
      );
      return;
    }
    if (entry === "full-replay") {
      announceGameState("Same-seed run replayed from Floor 1 with fresh health and progress.");
      return;
    }
    if (entry === "new-run") {
      announceGameState("New deterministic three-floor run generated. Floor 1 begins.");
      return;
    }
    if (entry === "next-floor") return;
    announceGameState(
      "Three-floor run ready. Find the Runic Key and Ancient Gate on each floor; health, shards, and upgrades carry between floors.",
    );
  }
}
