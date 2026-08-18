import Phaser from "phaser";

import { createGameConfig } from "./game/config";
import {
  ACTIVE_SEED_REGISTRY_KEY,
  replaceSeedInUrl,
  resolveInitialSeed,
} from "./game/dungeon/seedSession";
import "./styles.css";
import { detectRuntimeCapabilities, selectRendererCapability } from "./game/platform/capabilities";
import { createFatalErrorContent, showFatalError } from "./game/platform/fatalError";
import { RELEASE_IDENTITY } from "./game/platform/version";

const initialSeed = resolveInitialSeed(window.location.search);
replaceSeedInUrl(initialSeed);
const releaseVersion = document.querySelector<HTMLElement>("#release-version");
if (releaseVersion) releaseVersion.textContent = RELEASE_IDENTITY.label;
const container = document.querySelector<HTMLElement>("#game-container");
if (!container) throw new Error("Dungeon Escape game container is unavailable.");

const capabilities = detectRuntimeCapabilities();
const forcedFatalRenderer =
  import.meta.env.MODE === "e2e" &&
  (import.meta.env.VITE_E2E_FATAL_RENDERER === "1" ||
    new URLSearchParams(window.location.search).has("__renderer_fatal"));
const rendererCapability = forcedFatalRenderer
  ? "unavailable"
  : selectRendererCapability(capabilities);
let game: Phaser.Game | undefined;
let fatalPresented = false;
const presentFatalOnce = (reason: "renderer" | "initialization" = "initialization"): void => {
  if (fatalPresented) return;
  fatalPresented = true;
  game?.destroy(true);
  game = undefined;
  showFatalError(container, createFatalErrorContent(RELEASE_IDENTITY, reason));
};
const handleUnexpectedError = (): void => queueMicrotask(() => presentFatalOnce());
window.addEventListener("error", handleUnexpectedError);
window.addEventListener("unhandledrejection", handleUnexpectedError);

try {
  if (rendererCapability === "unavailable") {
    presentFatalOnce("renderer");
  } else {
    const e2eRenderer =
      import.meta.env.MODE === "e2e" ? import.meta.env.VITE_E2E_RENDERER : undefined;
    game = new Phaser.Game(createGameConfig(e2eRenderer));
    game.registry.set(ACTIVE_SEED_REGISTRY_KEY, initialSeed);
    game.registry.set("runtime-capabilities", capabilities);
    game.canvas.setAttribute("aria-label", "Dungeon Escape game canvas");
    game.canvas.setAttribute("aria-describedby", "game-help game-state game-summary");
    if (import.meta.env.MODE === "e2e") {
      void import("./game/testing/testBridge").then(({ installE2EBridge }) => {
        if (game) installE2EBridge(game);
      });
    }
  }
} catch (error) {
  console.error("Dungeon Escape initialization failed.", error);
  presentFatalOnce();
}

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    window.removeEventListener("error", handleUnexpectedError);
    window.removeEventListener("unhandledrejection", handleUnexpectedError);
    game?.destroy(true);
  });
