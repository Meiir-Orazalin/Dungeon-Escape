export type RendererName = "auto" | "canvas" | "webgl" | "unknown";
export const PHASER_RENDERER_TYPES = Object.freeze({ AUTO: 0, CANVAS: 1, WEBGL: 2 });

export function rendererTypeForBoot(isE2E: boolean, override: string | undefined): number {
  return isE2E && override === "canvas" ? PHASER_RENDERER_TYPES.CANVAS : PHASER_RENDERER_TYPES.AUTO;
}

export function formatRendererType(rendererType: number | undefined): RendererName {
  if (rendererType === PHASER_RENDERER_TYPES.CANVAS) return "canvas";
  if (rendererType === PHASER_RENDERER_TYPES.WEBGL) return "webgl";
  if (rendererType === PHASER_RENDERER_TYPES.AUTO) return "auto";
  return "unknown";
}
