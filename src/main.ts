import Phaser from "phaser";

import { gameConfig } from "./game/config";
import {
  ACTIVE_SEED_REGISTRY_KEY,
  replaceSeedInUrl,
  resolveInitialSeed,
} from "./game/dungeon/seedSession";
import "./styles.css";

const initialSeed = resolveInitialSeed(window.location.search);
replaceSeedInUrl(initialSeed);
const game = new Phaser.Game(gameConfig);
game.registry.set(ACTIVE_SEED_REGISTRY_KEY, initialSeed);

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
