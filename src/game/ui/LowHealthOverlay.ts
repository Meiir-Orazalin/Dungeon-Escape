import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";

export class LowHealthOverlay {
  private readonly vignette: Phaser.GameObjects.Rectangle;
  private pulse?: Phaser.Tweens.Tween;
  public constructor(private readonly scene: Phaser.Scene) {
    this.vignette = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x791e25, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(905)
      .setVisible(false);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }
  public setState(visible: boolean, reducedMotion: boolean, highContrast = false): void {
    this.pulse?.destroy();
    this.pulse = undefined;
    this.vignette
      .setFillStyle(highContrast ? 0x941e2a : 0x791e25)
      .setStrokeStyle(highContrast && visible ? 5 : 0, 0xffe0b0, highContrast ? 0.7 : 0)
      .setVisible(visible)
      .setAlpha(visible ? (highContrast ? 0.15 : 0.11) : 0);
    if (visible && !reducedMotion)
      this.pulse = this.scene.tweens.add({
        targets: this.vignette,
        alpha: { from: 0.08, to: 0.16 },
        duration: 900,
        yoyo: true,
        repeat: -1,
      });
  }
  public destroy(): void {
    this.pulse?.destroy();
    this.vignette.destroy();
  }
}
