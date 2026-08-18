export interface RuntimeCapabilities {
  readonly canvas2d: boolean;
  readonly webgl: boolean;
  readonly audio: boolean;
  readonly storageRead: boolean;
  readonly storageWrite: boolean;
  readonly fullscreen: boolean;
  readonly reducedMotion: boolean;
  readonly pointer: boolean;
}

export type RendererCapability = "webgl" | "canvas" | "unavailable";

export function selectRendererCapability(
  capabilities: Pick<RuntimeCapabilities, "canvas2d" | "webgl">,
): RendererCapability {
  if (capabilities.webgl) return "webgl";
  if (capabilities.canvas2d) return "canvas";
  return "unavailable";
}

function storageCapabilities(storage: Storage | undefined): {
  readonly read: boolean;
  readonly write: boolean;
} {
  if (!storage) return { read: false, write: false };
  const read = (() => {
    try {
      storage.getItem("dungeon-escape.capability-probe");
      return true;
    } catch {
      return false;
    }
  })();
  const write = (() => {
    try {
      const key = "dungeon-escape.capability-probe";
      storage.setItem(key, "1");
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  })();
  return { read, write };
}

export function detectRuntimeCapabilities(
  targetWindow: Window = window,
  targetDocument: Document = document,
): RuntimeCapabilities {
  const canvas = targetDocument.createElement("canvas");
  const hasContext = (type: string): boolean => {
    try {
      return canvas.getContext(type) !== null;
    } catch {
      return false;
    }
  };
  const canvas2d = hasContext("2d");
  const webgl = hasContext("webgl2") || hasContext("webgl") || hasContext("experimental-webgl");
  let storage: Storage | undefined;
  try {
    storage = targetWindow.localStorage;
  } catch {
    storage = undefined;
  }
  const storageSupport = storageCapabilities(storage);
  const audioWindow = targetWindow as Window & {
    readonly Audio?: unknown;
    readonly AudioContext?: unknown;
    readonly webkitAudioContext?: unknown;
  };
  return Object.freeze({
    canvas2d,
    webgl,
    audio:
      typeof audioWindow.Audio === "function" ||
      typeof audioWindow.AudioContext === "function" ||
      typeof audioWindow.webkitAudioContext === "function",
    storageRead: storageSupport.read,
    storageWrite: storageSupport.write,
    fullscreen: typeof targetDocument.documentElement.requestFullscreen === "function",
    reducedMotion:
      typeof targetWindow.matchMedia === "function" &&
      targetWindow.matchMedia("(prefers-reduced-motion: reduce)").matches,
    pointer: "PointerEvent" in targetWindow,
  });
}
