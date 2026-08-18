import type { RunOutcome } from "../combat/types";
import type { ActiveRunActivity } from "../run/types";

export type PresentationModal =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "pause" }>
  | Readonly<{ kind: "manual"; returnTo: "menu" | "pause" | "game" }>
  | Readonly<{ kind: "settings"; returnTo: "menu" | "pause" }>;

export type PresentationModalEvent =
  | Readonly<{ type: "open-pause" }>
  | Readonly<{ type: "open-manual"; returnTo: "menu" | "pause" | "game" }>
  | Readonly<{ type: "open-settings"; returnTo: "menu" | "pause" }>
  | Readonly<{ type: "back" }>
  | Readonly<{ type: "resume" }>
  | Readonly<{ type: "shutdown" }>;

export interface ModalRuntime {
  readonly outcome: RunOutcome;
  readonly activity: ActiveRunActivity;
}

export const NO_PRESENTATION_MODAL: PresentationModal = Object.freeze({ kind: "none" });

export function transitionPresentationModal(
  current: PresentationModal,
  event: PresentationModalEvent,
  runtime: ModalRuntime,
): PresentationModal {
  if (event.type === "shutdown") return NO_PRESENTATION_MODAL;
  if (event.type === "open-pause") {
    if (current.kind !== "none" || runtime.outcome !== "active" || runtime.activity !== "playing") {
      return current;
    }
    return Object.freeze({ kind: "pause" });
  }
  if (event.type === "open-manual") {
    if (current.kind === "manual" || current.kind === "settings") return current;
    if (event.returnTo === "pause" && current.kind !== "pause") return current;
    if (event.returnTo === "game" && current.kind !== "none") return current;
    return Object.freeze({ kind: "manual", returnTo: event.returnTo });
  }
  if (event.type === "open-settings") {
    if (current.kind === "manual" || current.kind === "settings") return current;
    if (event.returnTo === "pause" && current.kind !== "pause") return current;
    return Object.freeze({ kind: "settings", returnTo: event.returnTo });
  }
  if (event.type === "resume") {
    return current.kind === "pause" ? NO_PRESENTATION_MODAL : current;
  }
  if (event.type === "back") {
    if (current.kind === "manual" || current.kind === "settings") {
      return current.returnTo === "pause"
        ? Object.freeze({ kind: "pause" })
        : NO_PRESENTATION_MODAL;
    }
    return current.kind === "pause" ? NO_PRESENTATION_MODAL : current;
  }
  return current;
}
