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
import { OBJECTIVE_CONFIG } from "../objective/config";
import { createEscapeObjective } from "../objective/createEscapeObjective";
import { selectInteractionTarget } from "../objective/interaction";
import {
  createInitialObjectiveState,
  objectiveHasKey,
  reduceObjectiveState,
} from "../objective/objectiveState";
import type {
  EscapeObjectivePlan,
  EscapeObjectiveState,
  ObjectiveTargetId,
} from "../objective/types";
import { DungeonRenderer } from "../rendering/DungeonRenderer";
import { announceGameState } from "../ui/announce";
import { DungeonHud } from "../ui/DungeonHud";
import { DungeonMinimap } from "../ui/DungeonMinimap";
import { FloorCompleteOverlay } from "../ui/FloorCompleteOverlay";
import { InteractionPrompt } from "../ui/InteractionPrompt";
import { ObjectiveToast } from "../ui/ObjectiveToast";
import { PlayerDefeatedOverlay } from "../ui/PlayerDefeatedOverlay";

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
}

export class GameScene extends Phaser.Scene {
  private layout?: DungeonLayout;
  private objectivePlan?: EscapeObjectivePlan;
  private encounterPlan?: EncounterPlan;
  private objectiveState: EscapeObjectiveState = createInitialObjectiveState();
  private runOutcome: RunOutcome = "active";
  private player?: Player;
  private runicKey?: RunicKey;
  private ancientGate?: AncientGate;
  private enemies?: EnemyManager;
  private combat?: CombatController;
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
        enemyDefeated: () => this.handleEnemyDefeated(),
      },
    );
    this.combat = new CombatController(this, this.player, this.enemies, {
      healthChanged: (vitality) => this.hud?.updateHealth(vitality),
      playerDefeated: () => this.defeatRun(),
    });

    this.hud = new DungeonHud(this, this.layout, this.encounterPlan.enemies.length);
    this.hud.updateObjective(this.objectiveState);
    this.hud.updateTimer(0);
    this.hud.updateHealth(this.combat.getVitality());
    this.hud.updateEnemies(0, this.encounterPlan.enemies.length);
    this.hud.updateDash(this.combat.getDashState());
    this.minimap = new DungeonMinimap(this, this.layout, this.objectivePlan, this.encounterPlan);
    this.minimap.update(this.discovery, this.objectiveState, this.enemies.getAliveEnemyIds());
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
      !this.enemies
    ) {
      return;
    }
    if (this.runOutcome !== "active" || this.isTransitioning) {
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
    this.updateInteractionPrompt();
  }

  public getTestSnapshot(): GameSceneSnapshot | null {
    if (
      !this.player ||
      !this.layout ||
      !this.objectivePlan ||
      !this.encounterPlan ||
      !this.discovery ||
      !this.enemies ||
      !this.combat
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

    return {
      playerPosition: { x: this.player.x, y: this.player.y },
      spawnPosition: { x: spawnPoint.x, y: spawnPoint.y },
      seed: this.layout.seed,
      layoutFingerprint: this.layout.fingerprint,
      objectiveFingerprint: this.objectivePlan.fingerprint,
      encounterFingerprint: this.encounterPlan.fingerprint,
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
      movementEnabled: this.runOutcome === "active" && !this.isTransitioning,
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
    };
  }

  private resetRuntimeState(): void {
    this.objectiveState = createInitialObjectiveState();
    this.runOutcome = "active";
    this.elapsedTimeMs = 0;
    this.lastPlayerTileIndex = -1;
    this.isTransitioning = false;
    this.isInteractionHeld = false;
    this.isSpaceAttackHeld = false;
    this.isJAttackHeld = false;
    this.isDashHeld = false;
    this.completionOverlay = undefined;
    this.defeatOverlay = undefined;
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
    if (this.runOutcome === "active" && !this.isTransitioning) {
      this.combat?.beginDash(this.readMovementInput());
    }
  }

  private handleDashUp(): void {
    this.isDashHeld = false;
  }

  private handlePointerAttack(pointer: Phaser.Input.Pointer): void {
    if (pointer.button !== 0 || this.runOutcome !== "active" || this.isTransitioning) return;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.combat?.beginPointerAttack(worldPoint);
  }

  private handleActiveRestart(): void {
    if (this.runOutcome !== "active") return;
    this.restartFloor();
  }

  private handleActiveNewDungeon(): void {
    if (this.runOutcome !== "active") return;
    this.generateNewDungeon();
  }

  private attack(): void {
    if (this.runOutcome !== "active" || this.isTransitioning) return;
    this.combat?.beginFacingAttack();
  }

  private interact(): void {
    if (
      !this.player ||
      this.runOutcome !== "active" ||
      this.isTransitioning ||
      this.combat?.canInteract() !== true
    ) {
      return;
    }
    const target = this.currentInteractionTarget();
    if (target === "key") this.collectKey();
    if (target === "gate") this.attemptGate();
  }

  private currentInteractionTarget(): ObjectiveTargetId | null {
    if (!this.player || !this.objectivePlan || this.runOutcome !== "active") return null;
    return selectInteractionTarget(this.player, [
      {
        id: "key",
        position: this.objectivePlan.keyPosition,
        available: this.objectiveState.status === "seeking-key" && this.runicKey?.active === true,
      },
      {
        id: "gate",
        position: this.objectivePlan.gatePosition,
        available: this.objectiveState.status !== "completed",
      },
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
    this.combat.stopTerminal();
    this.enemies.stopAll();
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

  private handleEnemyDefeated(): void {
    if (!this.enemies) return;
    this.hud?.updateEnemies(this.enemies.getDefeatedCount(), this.enemies.getTotalCount());
    this.updateMinimap();
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
    this.combat.stopTerminal();
    this.enemies.stopAll();
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
    this.interactionPrompt?.setText(null);
    this.registry.set(ACTIVE_SEED_REGISTRY_KEY, this.layout.seed);
    this.scene.restart({ seed: this.layout.seed, entry: "restart" });
  }

  private generateNewDungeon(): void {
    if (this.isTransitioning || !this.layout) return;
    this.isTransitioning = true;
    this.combat?.stopTerminal();
    this.enemies?.stopAll();
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
      target === "key"
        ? "E  ·  TAKE RUNIC KEY"
        : target === "gate"
          ? this.objectiveState.status === "seeking-key"
            ? "E  ·  INSPECT SEALED GATE"
            : "E  ·  OPEN ANCIENT GATE"
          : null;
    this.interactionPrompt?.setText(text);
  }

  private updateObjectivePresentation(): void {
    this.hud?.updateObjective(this.objectiveState);
    this.updateMinimap();
    this.updateInteractionPrompt();
  }

  private updateMinimap(): void {
    if (!this.discovery || !this.enemies) return;
    this.minimap?.update(this.discovery, this.objectiveState, this.enemies.getAliveEnemyIds());
  }

  private announceFloorStart(entry: GameSceneData["entry"]): void {
    if (entry === "restart") {
      announceGameState(
        "Floor restarted with the same seed. Find the Runic Key. Space, J, or click attacks; Shift dashes.",
      );
      return;
    }
    if (entry === "new") {
      announceGameState(
        "New dungeon generated. Find the Runic Key, fight or evade enemies, and open the Ancient Gate.",
      );
      return;
    }
    announceGameState(
      "Generated dungeon ready. Find the Runic Key and open the Ancient Gate. Space, J, or click attacks; Shift dashes; E interacts.",
    );
  }
}
