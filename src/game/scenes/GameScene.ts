import Phaser from "phaser";

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
}

export class GameScene extends Phaser.Scene {
  private layout?: DungeonLayout;
  private objectivePlan?: EscapeObjectivePlan;
  private objectiveState: EscapeObjectiveState = createInitialObjectiveState();
  private player?: Player;
  private runicKey?: RunicKey;
  private ancientGate?: AncientGate;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: MovementKeys;
  private interactionKey?: Phaser.Input.Keyboard.Key;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private newDungeonKey?: Phaser.Input.Keyboard.Key;
  private discovery?: RoomDiscoveryState;
  private minimap?: DungeonMinimap;
  private hud?: DungeonHud;
  private interactionPrompt?: InteractionPrompt;
  private objectiveToast?: ObjectiveToast;
  private completionOverlay?: FloorCompleteOverlay;
  private lastPlayerTileIndex = -1;
  private elapsedTimeMs = 0;
  private isTransitioning = false;
  private isInteractionHeld = false;

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
    } catch {
      announceGameState(
        "Dungeon objective planning failed safely. Return to the menu and try a new seed.",
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
    this.hud = new DungeonHud(this, this.layout);
    this.hud.updateObjective(this.objectiveState);
    this.hud.updateTimer(0);
    this.minimap = new DungeonMinimap(this, this.layout, this.objectivePlan);
    this.minimap.update(this.discovery, this.objectiveState);
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
    if (!this.player || !this.cursors || !this.wasd || !this.layout) return;
    if (this.objectiveState.status === "completed" || this.isTransitioning) {
      this.player.stopMovement();
      return;
    }

    this.elapsedTimeMs += Number.isFinite(delta) && delta > 0 ? delta : 0;
    this.hud?.updateTimer(this.elapsedTimeMs);
    const movementInput: MovementInput = {
      up: this.cursors.up.isDown || this.wasd.up.isDown,
      down: this.cursors.down.isDown || this.wasd.down.isDown,
      left: this.cursors.left.isDown || this.wasd.left.isDown,
      right: this.cursors.right.isDown || this.wasd.right.isDown,
    };
    this.player.applyMovement(movementInput);
    this.updateDiscovery();
    this.updateInteractionPrompt();
  }

  public getTestSnapshot(): GameSceneSnapshot | null {
    if (!this.player || !this.layout || !this.objectivePlan || !this.discovery) return null;
    const spawnPoint = this.player.getSpawnPoint();
    const completedTime =
      this.objectiveState.status === "completed"
        ? this.objectiveState.completionTimeMs
        : this.elapsedTimeMs;

    return {
      playerPosition: { x: this.player.x, y: this.player.y },
      spawnPosition: { x: spawnPoint.x, y: spawnPoint.y },
      seed: this.layout.seed,
      layoutFingerprint: this.layout.fingerprint,
      objectiveFingerprint: this.objectivePlan.fingerprint,
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
      floorComplete: this.objectiveState.status === "completed",
      movementEnabled: this.objectiveState.status !== "completed" && !this.isTransitioning,
      interactionPrompt: this.interactionPrompt?.getText() ?? null,
      elapsedTimeMs: completedTime,
    };
  }

  private resetRuntimeState(): void {
    this.objectiveState = createInitialObjectiveState();
    this.elapsedTimeMs = 0;
    this.lastPlayerTileIndex = -1;
    this.isTransitioning = false;
    this.isInteractionHeld = false;
    this.completionOverlay = undefined;
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
    this.interactionKey.on("down", this.handleInteractionDown, this);
    this.interactionKey.on("up", this.handleInteractionUp, this);
    this.restartKey.on("down", this.handleActiveRestart, this);
    this.newDungeonKey.on("down", this.handleActiveNewDungeon, this);
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

  private handleActiveRestart(): void {
    if (this.objectiveState.status === "completed") return;
    this.restartFloor();
  }

  private handleActiveNewDungeon(): void {
    if (this.objectiveState.status === "completed") return;
    this.generateNewDungeon();
  }

  private interact(): void {
    if (!this.player || this.objectiveState.status === "completed" || this.isTransitioning) return;
    const target = this.currentInteractionTarget();
    if (target === "key") this.collectKey();
    if (target === "gate") this.attemptGate();
  }

  private currentInteractionTarget(): ObjectiveTargetId | null {
    if (!this.player || !this.objectivePlan) return null;
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
      this.objectiveState.status !== "completed"
    ) {
      return;
    }
    this.player.stopMovement();
    this.interactionPrompt?.setText(null);
    this.hud?.updateObjective(this.objectiveState);
    this.hud?.updateTimer(this.objectiveState.completionTimeMs);
    this.minimap?.update(this.discovery, this.objectiveState);
    this.ancientGate?.playCompletion();
    this.cameras.main.flash(OBJECTIVE_CONFIG.completionTransitionMs, 202, 181, 122, false);
    announceGameState("Dungeon escaped. Replay this seed or generate a new dungeon.");

    this.time.delayedCall(OBJECTIVE_CONFIG.completionTransitionMs, () => {
      if (
        this.objectiveState.status !== "completed" ||
        !this.layout ||
        !this.discovery ||
        this.completionOverlay
      ) {
        return;
      }
      this.completionOverlay = new FloorCompleteOverlay(
        this,
        {
          seed: this.layout.seed,
          completionTimeMs: this.objectiveState.completionTimeMs,
          discoveredRooms: this.discovery.discoveredRoomIds.size,
          totalRooms: this.layout.rooms.length,
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
    this.player?.stopMovement();
    this.interactionPrompt?.setText(null);
    this.registry.set(ACTIVE_SEED_REGISTRY_KEY, this.layout.seed);
    this.scene.restart({ seed: this.layout.seed, entry: "restart" });
  }

  private generateNewDungeon(): void {
    if (this.isTransitioning || !this.layout) return;
    this.isTransitioning = true;
    this.player?.stopMovement();
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
    this.cursors = undefined;
    this.wasd = undefined;
    this.interactionKey = undefined;
    this.restartKey = undefined;
    this.newDungeonKey = undefined;
    this.isInteractionHeld = false;
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
    this.minimap?.update(nextDiscovery, this.objectiveState);
    this.hud?.updateDiscovered(nextDiscovery.discoveredRoomIds.size, this.layout.rooms.length);
  }

  private updateInteractionPrompt(): void {
    const target = this.currentInteractionTarget();
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
    if (this.discovery) this.minimap?.update(this.discovery, this.objectiveState);
    this.updateInteractionPrompt();
  }

  private announceFloorStart(entry: GameSceneData["entry"]): void {
    if (entry === "restart") {
      announceGameState("Floor restarted with the same seed. Find the Runic Key.");
      return;
    }
    if (entry === "new") {
      announceGameState("New dungeon generated. Find the Runic Key and open the Ancient Gate.");
      return;
    }
    announceGameState(
      "Generated dungeon ready. Find the Runic Key, then open the Ancient Gate. Press E to interact.",
    );
  }
}
