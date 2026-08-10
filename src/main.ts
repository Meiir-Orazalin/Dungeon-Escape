import Phaser from "phaser";

import { gameConfig } from "./game/config";
import "./styles.css";

const game = new Phaser.Game(gameConfig);

game.canvas.setAttribute("aria-label", "Dungeon Escape game canvas");
game.canvas.setAttribute("aria-describedby", "game-help game-state");

if (import.meta.env.MODE === "e2e") {
  void import("./game/testing/testBridge").then(({ installE2EBridge }) => {
    installE2EBridge(game);
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}
