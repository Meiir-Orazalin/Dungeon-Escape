import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";

export class FloorIntro {
  private readonly container: Phaser.GameObjects.Container;
  public constructor(
    scene: Phaser.Scene,
    floorNumber: number,
    floorName: string,
    reducedMotion: boolean,
  ) {
    this.container = scene.add
      .container(0, 0)
      .setName("floor-intro")
      .setScrollFactor(0)
      .setDepth(930);
    const veil = scene.add
      .rectangle(0, GAME_HEIGHT / 2 - 62, GAME_WIDTH, 124, 0x050708, 0.7)
      .setOrigin(0);
    const floor = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 25, `FLOOR ${floorNumber} / 3`, {
        color: "#d0a662",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    const name = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 18, floorName, {
        color: "#f0e5ca",
        fontFamily: "Georgia, serif",
        fontSize: "30px",
        fontStyle: "bold",
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    this.container.add([veil, floor, name]);
    scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: reducedMotion ? 180 : 360,
      delay: reducedMotion ? 320 : 840,
      onComplete: () => this.destroy(),
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }
  public destroy(): void {
    if (this.container.active) this.container.destroy(true);
  }
}
