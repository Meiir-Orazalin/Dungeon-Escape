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
import { Player } from "../entities/Player";
import type { MovementInput } from "../input/movement";
import { DungeonRenderer } from "../rendering/DungeonRenderer";
import { announceGameState } from "../ui/announce";
import { DungeonHud } from "../ui/DungeonHud";
import { DungeonMinimap } from "../ui/DungeonMinimap";

interface MovementKeys {
  readonly up: Phaser.Input.Keyboard.Key;
  readonly down: Phaser.Input.Keyboard.Key;
  readonly left: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
}

interface GameSceneData {
  readonly seed?: string;
}

export interface GameSceneSnapshot {
  readonly playerPosition: { readonly x: number; readonly y: number };
  readonly spawnPosition: { readonly x: number; readonly y: number };
  readonly seed: string;
  readonly layoutFingerprint: string;
  readonly roomCount: number;
  readonly spawnRoomId: number;
  readonly destinationRoomId: number;
  readonly worldSize: { readonly width: number; readonly height: number };
  readonly discoveredRoomCount: number;
  readonly currentRoomId: number;
  readonly playerOnWalkableTile: boolean;
}

export class GameScene extends Phaser.Scene {
  private layout?: DungeonLayout;
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: MovementKeys;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private newDungeonKey?: Phaser.Input.Keyboard.Key;
  private discovery?: RoomDiscoveryState;
  private minimap?: DungeonMinimap;
  private hud?: DungeonHud;
  private lastPlayerTileIndex = -1;
  private isRegenerating = false;

  public constructor() {
    super(SCENE_KEYS.GAME);
  }

  public create(data: GameSceneData = {}): void {
    this.isRegenerating = false;
    const registrySeed = this.registry.get(ACTIVE_SEED_REGISTRY_KEY) as unknown;
    const requestedSeed =
      data.seed ?? (typeof registrySeed === "string" ? registrySeed : createFriendlySeed());

    try {
      this.layout = generateDungeon(requestedSeed);
    } catch {
      announceGameState("Dungeon generation failed safely. Return to the menu and try a new seed.");
      this.scene.start(SCENE_KEYS.MENU);
      return;
    }

    this.registry.set(ACTIVE_SEED_REGISTRY_KEY, this.layout.seed);
    replaceSeedInUrl(this.layout.seed);
    this.physics.world.setBounds(0, 0, this.layout.worldWidth, this.layout.worldHeight);

    const renderer = new DungeonRenderer(this, this.layout);
    renderer.build();
    this.player = new Player(this, this.layout.spawn);
    this.physics.add.collider(this.player, renderer.collisionGroup);

    this.configureCamera();
    this.registerInput();

    this.discovery = createRoomDiscovery(this.layout.spawnRoomId);
    this.hud = new DungeonHud(this, this.layout);
    this.minimap = new DungeonMinimap(this, this.layout);
    this.minimap.update(this.discovery);
    this.lastPlayerTileIndex = tileIndex(
      this.layout.spawn.tileX,
      this.layout.spawn.tileY,
      this.layout.mapWidth,
    );

    announceGameState(
      "Exploring a generated dungeon. Use WASD or arrow keys to move, R to return, and N for a new dungeon.",
    );
  }

  public override update(): void {
    if (!this.player || !this.cursors || !this.wasd || !this.layout) return;

    const movementInput: MovementInput = {
      up: this.cursors.up.isDown || this.wasd.up.isDown,
      down: this.cursors.down.isDown || this.wasd.down.isDown,
      left: this.cursors.left.isDown || this.wasd.left.isDown,
      right: this.cursors.right.isDown || this.wasd.right.isDown,
    };

    this.player.applyMovement(movementInput);
    this.updateDiscovery();
  }

  public getTestSnapshot(): GameSceneSnapshot | null {
    if (!this.player || !this.layout || !this.discovery) return null;

    const spawnPoint = this.player.getSpawnPoint();
    return {
      playerPosition: { x: this.player.x, y: this.player.y },
      spawnPosition: { x: spawnPoint.x, y: spawnPoint.y },
      seed: this.layout.seed,
      layoutFingerprint: this.layout.fingerprint,
      roomCount: this.layout.rooms.length,
      spawnRoomId: this.layout.spawnRoomId,
      destinationRoomId: this.layout.destinationRoomId,
      worldSize: { width: this.layout.worldWidth, height: this.layout.worldHeight },
      discoveredRoomCount: this.discovery.discoveredRoomIds.size,
      currentRoomId: this.discovery.currentRoomId,
      playerOnWalkableTile: isWalkableWorldPoint(this.layout, this.player.x, this.player.y),
    };
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

    if (!keyboard) {
      throw new Error("Dungeon Escape requires keyboard input support.");
    }

    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.restartKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.newDungeonKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.restartKey.on("down", this.restartPlayer, this);
    this.newDungeonKey.on("down", this.generateNewDungeon, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanUpInput, this);
  }

  private restartPlayer(): void {
    if (!this.player) return;
    this.player.resetToSpawn();
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.cameras.main.flash(110, 198, 155, 92, false);
    announceGameState("Explorer returned to this dungeon's entrance. The seed is unchanged.");
  }

  private generateNewDungeon(): void {
    if (this.isRegenerating || !this.layout) return;
    this.isRegenerating = true;
    const seed = createFriendlySeed(this.layout.seed);
    this.registry.set(ACTIVE_SEED_REGISTRY_KEY, seed);
    replaceSeedInUrl(seed);
    this.scene.restart({ seed });
  }

  private cleanUpInput(): void {
    this.restartKey?.off("down", this.restartPlayer, this);
    this.newDungeonKey?.off("down", this.generateNewDungeon, this);
    this.cursors = undefined;
    this.wasd = undefined;
    this.restartKey = undefined;
    this.newDungeonKey = undefined;
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
    this.minimap?.update(nextDiscovery);
    this.hud?.updateDiscovered(nextDiscovery.discoveredRoomIds.size, this.layout.rooms.length);
  }
}
