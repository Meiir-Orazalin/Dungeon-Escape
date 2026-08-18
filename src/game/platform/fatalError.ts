import type { ReleaseIdentity } from "./version";

export const FATAL_ERROR_TITLE = "DUNGEON ESCAPE COULD NOT START";

export interface FatalErrorContent {
  readonly title: typeof FATAL_ERROR_TITLE;
  readonly explanation: string;
  readonly guidance: string;
  readonly versionLabel: string;
}

export function createFatalErrorContent(
  release: ReleaseIdentity,
  reason: "renderer" | "initialization" = "initialization",
): FatalErrorContent {
  return Object.freeze({
    title: FATAL_ERROR_TITLE,
    explanation:
      reason === "renderer"
        ? "This browser could not provide a compatible WebGL or Canvas renderer."
        : "The game encountered a critical startup problem.",
    guidance: "Try reloading, or use a current Chromium, Firefox, or Safari-family browser.",
    versionLabel: release.label,
  });
}

export function showFatalError(
  container: HTMLElement,
  content: FatalErrorContent,
  reload: () => void = () => window.location.reload(),
): () => void {
  container.replaceChildren();
  const panel = document.createElement("section");
  panel.className = "fatal-error";
  panel.setAttribute("role", "alert");
  const title = document.createElement("h2");
  title.textContent = content.title;
  const explanation = document.createElement("p");
  explanation.textContent = content.explanation;
  const guidance = document.createElement("p");
  guidance.textContent = content.guidance;
  const version = document.createElement("p");
  version.className = "fatal-error__version";
  version.textContent = content.versionLabel;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Reload Game";
  button.addEventListener("click", reload);
  panel.append(title, explanation, guidance, button, version);
  container.append(panel);
  return () => button.removeEventListener("click", reload);
}
