import Phaser from "phaser";

import {
  INTERIOR_OBSTACLES,
  PLAYER_SPAWN,
  SCENE_KEYS,
  TEXTURE_KEYS,
  WALL_THICKNESS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type ObstacleDefinition,
} from "../constants";
import { Player } from "../entities/Player";
import type { MovementInput } from "../input/movement";
import { announceGameState } from "../ui/announce";

interface MovementKeys {
  readonly up: Phaser.Input.Keyboard.Key;
  readonly down: Phaser.Input.Keyboard.Key;
  readonly left: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
}

export interface GameSceneSnapshot {
  readonly playerPosition: { readonly x: number; readonly y: number };
  readonly spawnPosition: { readonly x: number; readonly y: number };
}

const OUTER_WALLS: readonly ObstacleDefinition[] = Object.freeze([
  { x: WORLD_WIDTH / 2, y: WALL_THICKNESS / 2, width: WORLD_WIDTH, height: WALL_THICKNESS },
  {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT - WALL_THICKNESS / 2,
    width: WORLD_WIDTH,
    height: WALL_THICKNESS,
  },
  { x: WALL_THICKNESS / 2, y: WORLD_HEIGHT / 2, width: WALL_THICKNESS, height: WORLD_HEIGHT },
  {
    x: WORLD_WIDTH - WALL_THICKNESS / 2,
    y: WORLD_HEIGHT / 2,
    width: WALL_THICKNESS,
    height: WORLD_HEIGHT,
  },
]);

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: MovementKeys;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private solids?: Phaser.Physics.Arcade.StaticGroup;

  public constructor() {
    super(SCENE_KEYS.GAME);
  }

  public create(): void {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.drawRoom();
    this.createCollisionGeometry();
    this.createTorches();
    this.createPlayer();
    this.configureCamera();
    this.registerInput();
    this.drawHud();
    announceGameState("Exploring the dungeon. Use WASD or arrow keys to move. Press R to restart.");
  }

  public override update(): void {
    if (!this.player || !this.cursors || !this.wasd) return;

    const movementInput: MovementInput = {
      up: this.cursors.up.isDown || this.wasd.up.isDown,
      down: this.cursors.down.isDown || this.wasd.down.isDown,
      left: this.cursors.left.isDown || this.wasd.left.isDown,
      right: this.cursors.right.isDown || this.wasd.right.isDown,
    };

    this.player.applyMovement(movementInput);
  }

  public getTestSnapshot(): GameSceneSnapshot | null {
    if (!this.player) return null;

    const spawnPoint = this.player.getSpawnPoint();
    return {
      playerPosition: { x: this.player.x, y: this.player.y },
      spawnPosition: { x: spawnPoint.x, y: spawnPoint.y },
    };
  }

  private drawRoom(): void {
    this.add
      .tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, TEXTURE_KEYS.FLOOR)
      .setDepth(-10)
      .setTint(0x9ba09b);

    const floorDetails = this.add.graphics().setDepth(-8);
    floorDetails.lineStyle(2, 0x2b3435, 0.45);

    const cracks = [
      [170, 125, 228, 102],
      [460, 338, 515, 365],
      [790, 590, 845, 565],
      [1040, 105, 1110, 132],
      [1070, 640, 1150, 615],
    ] as const;

    cracks.forEach(([x1, y1, x2, y2]) => {
      floorDetails.beginPath();
      floorDetails.moveTo(x1, y1);
      floorDetails.lineTo((x1 + x2) / 2, y1 + 12);
      floorDetails.lineTo(x2, y2);
      floorDetails.strokePath();
    });
  }

  private createCollisionGeometry(): void {
    this.solids = this.physics.add.staticGroup();

    [...OUTER_WALLS, ...INTERIOR_OBSTACLES].forEach((definition, index) => {
      const solid = this.physics.add
        .staticImage(definition.x, definition.y, TEXTURE_KEYS.STONE)
        .setDisplaySize(definition.width, definition.height)
        .setDepth(2)
        .setTint(index < OUTER_WALLS.length ? 0x8b9290 : 0xa0a6a1);
      solid.refreshBody();
      this.solids?.add(solid);

      this.add
        .rectangle(
          definition.x,
          definition.y,
          definition.width - 5,
          definition.height - 5,
          0x000000,
          0,
        )
        .setStrokeStyle(2, 0x596161, 0.45)
        .setDepth(3);
    });
  }

  private createTorches(): void {
    const torchPositions = [
      { x: 70, y: 160 },
      { x: 70, y: 560 },
      { x: 510, y: 70 },
      { x: 850, y: 70 },
      { x: 1210, y: 255 },
      { x: 1210, y: 590 },
    ] as const;

    torchPositions.forEach((position, index) => {
      const glow = this.add
        .circle(position.x, position.y, 54, 0xe69b42, 0.09)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3);
      this.add.circle(position.x, position.y, 8, 0x9e502b, 0.9).setDepth(4);
      this.add.circle(position.x, position.y - 3, 4, 0xffdda0, 1).setDepth(4);

      this.tweens.add({
        targets: glow,
        scale: 1.16,
        alpha: 0.14,
        duration: 780 + index * 43,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });
  }

  private createPlayer(): void {
    if (!this.solids) {
      throw new Error("Collision geometry must be created before the player.");
    }

    this.player = new Player(this, PLAYER_SPAWN);
    this.physics.add.collider(this.player, this.solids);
  }

  private configureCamera(): void {
    if (!this.player) return;

    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    camera.setBackgroundColor(0x080b0d);
    camera.startFollow(this.player, true, 0.09, 0.09);
    camera.setDeadzone(240, 130);
    camera.fadeIn(260, 7, 10, 11);
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
    this.restartKey.on("down", this.restartPlayer, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanUpInput, this);
  }

  private restartPlayer(): void {
    this.player?.resetToSpawn();
    this.cameras.main.flash(120, 198, 155, 92, false);
    announceGameState("Explorer returned to the dungeon entrance.");
  }

  private cleanUpInput(): void {
    this.restartKey?.off("down", this.restartPlayer, this);
    this.cursors = undefined;
    this.wasd = undefined;
    this.restartKey = undefined;
  }

  private drawHud(): void {
    const hud = this.add.container(26, 24).setScrollFactor(0).setDepth(20);
    const plate = this.add
      .rectangle(0, 0, 210, 54, 0x080b0d, 0.78)
      .setOrigin(0)
      .setStrokeStyle(1, 0xb88c52, 0.38);
    const label = this.add.text(16, 11, "THE SUNKEN ANTECHAMBER", {
      color: "#c7ad7f",
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      letterSpacing: 1.4,
    });
    const hint = this.add.text(16, 31, "R  ·  RETURN TO ENTRANCE", {
      color: "#748082",
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      letterSpacing: 1,
    });
    hud.add([plate, label, hint]);
  }
}
