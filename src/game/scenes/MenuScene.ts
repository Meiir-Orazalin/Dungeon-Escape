import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS, TEXTURE_KEYS } from "../constants";
import { announceGameState } from "../ui/announce";

export class MenuScene extends Phaser.Scene {
  private hasStarted = false;
  private startButton?: Phaser.GameObjects.Container;

  public constructor() {
    super(SCENE_KEYS.MENU);
  }

  public create(): void {
    this.hasStarted = false;
    this.drawBackdrop();
    this.drawMenu();
    this.registerInput();
    announceGameState("Main menu. Press Enter or Space, or select Start Game.");
  }

  private drawBackdrop(): void {
    this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, TEXTURE_KEYS.FLOOR)
      .setTint(0x687176);

    const shade = this.add.graphics();
    shade.fillGradientStyle(0x07090b, 0x07090b, 0x11181a, 0x11181a, 0.72, 0.72, 0.35, 0.35);
    shade.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    shade.lineStyle(1, 0x9c7745, 0.3);
    shade.strokeRect(29, 29, GAME_WIDTH - 58, GAME_HEIGHT - 58);
    shade.lineStyle(1, 0xc69b5c, 0.13);
    shade.strokeRect(36, 36, GAME_WIDTH - 72, GAME_HEIGHT - 72);

    this.add.circle(114, 112, 95, 0xf1a64a, 0.05).setBlendMode(Phaser.BlendModes.ADD);
    this.add.circle(846, 420, 130, 0x5a8591, 0.045).setBlendMode(Phaser.BlendModes.ADD);
  }

  private drawMenu(): void {
    this.add
      .text(GAME_WIDTH / 2, 112, "THE FIRST DESCENT", {
        color: "#bd9b67",
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        letterSpacing: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 174, "DUNGEON ESCAPE", {
        color: "#eef0e7",
        fontFamily: "Georgia, Times New Roman, serif",
        fontSize: "58px",
        fontStyle: "bold",
        stroke: "#080a0b",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        225,
        "Every seed reshapes the halls. No two descents need be the same.",
        {
          color: "#8f9b9d",
          fontFamily: "Georgia, Times New Roman, serif",
          fontSize: "17px",
          fontStyle: "italic",
        },
      )
      .setOrigin(0.5);

    const buttonPlate = this.add
      .rectangle(0, 0, 270, 58, 0x151d1f, 0.98)
      .setStrokeStyle(1, 0xc69b5c, 0.72);
    const buttonLabel = this.add
      .text(0, 0, "START GAME", {
        color: "#f3d7a1",
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    this.startButton = this.add.container(GAME_WIDTH / 2, 318, [buttonPlate, buttonLabel]);
    this.startButton.setSize(270, 58).setInteractive({ useHandCursor: true });
    this.startButton.on("pointerover", () => {
      buttonPlate.setFillStyle(0x273033, 1);
      buttonPlate.setStrokeStyle(2, 0xe1b66f, 0.95);
    });
    this.startButton.on("pointerout", () => {
      buttonPlate.setFillStyle(0x151d1f, 0.98);
      buttonPlate.setStrokeStyle(1, 0xc69b5c, 0.72);
    });
    this.startButton.on("pointerdown", this.startGame, this);

    this.add
      .text(GAME_WIDTH / 2, 379, "PRESS  ENTER  OR  SPACE", {
        color: "#7f8b8d",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    const controls = this.add.container(GAME_WIDTH / 2, 454);
    const controlPlate = this.add
      .rectangle(0, 0, 520, 62, 0x0b0f11, 0.54)
      .setStrokeStyle(1, 0x536164, 0.3);
    const controlText = this.add
      .text(0, 0, "WASD / ARROWS  ·  MOVE     R  ·  RETURN     N  ·  NEW DUNGEON", {
        color: "#a7b0af",
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        letterSpacing: 1.5,
      })
      .setOrigin(0.5);
    controls.add([controlPlate, controlText]);
  }

  private registerInput(): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error("Dungeon Escape requires keyboard input support.");
    }

    keyboard.on("keydown-ENTER", this.startGame, this);
    keyboard.on("keydown-SPACE", this.startGame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanUpInput, this);
  }

  private startGame(): void {
    if (this.hasStarted) return;

    this.hasStarted = true;
    this.startButton?.disableInteractive();
    this.scene.start(SCENE_KEYS.GAME);
  }

  private cleanUpInput(): void {
    this.input.keyboard?.off("keydown-ENTER", this.startGame, this);
    this.input.keyboard?.off("keydown-SPACE", this.startGame, this);
    this.startButton?.removeAllListeners();
  }
}
