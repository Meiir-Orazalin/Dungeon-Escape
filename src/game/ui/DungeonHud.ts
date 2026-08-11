import type Phaser from "phaser";

import { deriveHealthPips, formatDashStatus, formatEnemyCount } from "../combat/hudFormat";
import type { DashState, PlayerVitality } from "../combat/types";
import type { DungeonLayout } from "../dungeon/types";
import { formatElapsedTime } from "../objective/timer";
import type { EscapeObjectiveState } from "../objective/types";

export class DungeonHud {
  private readonly discoveredText: Phaser.GameObjects.Text;
  private readonly objectiveText: Phaser.GameObjects.Text;
  private readonly keyText: Phaser.GameObjects.Text;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly healthGraphics: Phaser.GameObjects.Graphics;
  private readonly enemiesText: Phaser.GameObjects.Text;
  private readonly dashText: Phaser.GameObjects.Text;
  private displayedSecond = -1;
  private displayedHealth = -1;
  private displayedEnemyCount = "";
  private displayedDash = "";

  public constructor(scene: Phaser.Scene, layout: DungeonLayout, totalEnemies: number) {
    const container = scene.add.container(22, 20).setScrollFactor(0).setDepth(50);
    const plate = scene.add
      .rectangle(0, 0, 700, 136, 0x080b0d, 0.86)
      .setOrigin(0)
      .setStrokeStyle(1, 0xb88c52, 0.42);
    const title = scene.add.text(16, 11, "THE SHIFTING CATACOMBS", {
      color: "#d1b47e",
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      letterSpacing: 1.5,
    });
    this.timerText = scene.add
      .text(682, 11, "TIME  ·  00:00", {
        color: "#d1b47e",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        letterSpacing: 1.1,
      })
      .setOrigin(1, 0);
    const seed = scene.add.text(16, 31, `SEED  ·  ${layout.seed}`, {
      color: "#929e9f",
      fontFamily: "Arial, sans-serif",
      fontSize: "9px",
      letterSpacing: 0.7,
    });
    this.objectiveText = scene.add.text(16, 50, "OBJECTIVE  ·  FIND THE RUNIC KEY", {
      color: "#e1bd79",
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
      letterSpacing: 0.8,
    });
    this.keyText = scene.add.text(400, 50, "KEY  ·  MISSING", {
      color: "#9b7770",
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
      letterSpacing: 0.8,
    });
    const healthLabel = scene.add.text(16, 72, "HEALTH", {
      color: "#b98a82",
      fontFamily: "Arial, sans-serif",
      fontSize: "9px",
      fontStyle: "bold",
      letterSpacing: 0.8,
    });
    this.healthGraphics = scene.add.graphics();
    this.enemiesText = scene.add.text(196, 72, `ENEMIES  ·  0 / ${totalEnemies}`, {
      color: "#b19d84",
      fontFamily: "Arial, sans-serif",
      fontSize: "9px",
      fontStyle: "bold",
      letterSpacing: 0.8,
    });
    this.dashText = scene.add.text(398, 72, "DASH  ·  READY", {
      color: "#85beb2",
      fontFamily: "Arial, sans-serif",
      fontSize: "9px",
      fontStyle: "bold",
      letterSpacing: 0.8,
    });
    const combatControls = scene.add.text(
      16,
      94,
      "SPACE / J / CLICK  ·  ATTACK     SHIFT  ·  DASH     E  ·  INTERACT",
      {
        color: "#778587",
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        letterSpacing: 0.72,
      },
    );
    const floorControls = scene.add.text(16, 116, "R  ·  RESTART     N  ·  NEW", {
      color: "#6f7c7e",
      fontFamily: "Arial, sans-serif",
      fontSize: "9px",
      letterSpacing: 0.9,
    });
    this.discoveredText = scene.add
      .text(682, 116, `1 / ${layout.rooms.length} ROOMS`, {
        color: "#a88a5e",
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        fontStyle: "bold",
        letterSpacing: 0.7,
      })
      .setOrigin(1, 0);
    container.add([
      plate,
      title,
      this.timerText,
      seed,
      this.objectiveText,
      this.keyText,
      healthLabel,
      this.healthGraphics,
      this.enemiesText,
      this.dashText,
      combatControls,
      floorControls,
      this.discoveredText,
    ]);
    this.updateHealth({
      status: "alive",
      health: 5,
      maximumHealth: 5,
      invulnerabilityRemainingMs: 0,
      hitStunRemainingMs: 0,
    });
  }

  public updateDiscovered(discovered: number, total: number): void {
    this.discoveredText.setText(`${discovered} / ${total} ROOMS`);
  }

  public updateObjective(state: EscapeObjectiveState): void {
    const objective =
      state.status === "seeking-key"
        ? "OBJECTIVE  ·  FIND THE RUNIC KEY"
        : state.status === "key-collected"
          ? "OBJECTIVE  ·  REACH THE ANCIENT GATE"
          : "OBJECTIVE  ·  ESCAPED";
    this.objectiveText.setText(objective);
    this.keyText
      .setText(state.status === "seeking-key" ? "KEY  ·  MISSING" : "KEY  ·  ACQUIRED")
      .setColor(state.status === "seeking-key" ? "#9b7770" : "#8fd0b8");
  }

  public updateTimer(elapsedTimeMs: number): void {
    const displayedSecond = Math.floor(Math.max(0, elapsedTimeMs) / 1_000);
    if (displayedSecond === this.displayedSecond) return;
    this.displayedSecond = displayedSecond;
    this.timerText.setText(`TIME  ·  ${formatElapsedTime(elapsedTimeMs)}`);
  }

  public updateHealth(vitality: PlayerVitality): void {
    if (vitality.health === this.displayedHealth) return;
    this.displayedHealth = vitality.health;
    const pips = deriveHealthPips(vitality.health, vitality.maximumHealth);
    this.healthGraphics.clear();
    for (let index = 0; index < pips.full + pips.empty; index += 1) {
      const full = index < pips.full;
      this.healthGraphics.fillStyle(full ? 0xc75d54 : 0x343b3d, full ? 1 : 0.72);
      this.healthGraphics.fillRoundedRect(75 + index * 19, 70, 14, 10, 2);
      this.healthGraphics.lineStyle(1, full ? 0xf09b83 : 0x596365, 0.8);
      this.healthGraphics.strokeRoundedRect(75 + index * 19, 70, 14, 10, 2);
    }
  }

  public updateEnemies(defeated: number, total: number): void {
    const count = formatEnemyCount(defeated, total);
    if (count === this.displayedEnemyCount) return;
    this.displayedEnemyCount = count;
    this.enemiesText.setText(`ENEMIES  ·  ${count}`);
  }

  public updateDash(state: DashState): void {
    const display = formatDashStatus(state);
    if (display === this.displayedDash) return;
    this.displayedDash = display;
    this.dashText
      .setText(`DASH  ·  ${display}`)
      .setColor(state.status === "ready" ? "#85beb2" : "#9b8f75");
  }
}
