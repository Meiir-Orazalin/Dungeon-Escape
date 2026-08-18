export interface CanvasBounds {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface CameraTransform {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly zoom: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
}

export function mapClientPointerToWorld(
  clientX: number,
  clientY: number,
  bounds: CanvasBounds,
  camera: CameraTransform,
): Readonly<{ x: number; y: number }> {
  const values = [
    clientX,
    clientY,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    camera.scrollX,
    camera.scrollY,
    camera.zoom,
    camera.viewportWidth,
    camera.viewportHeight,
  ];
  if (
    values.some((value) => !Number.isFinite(value)) ||
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    camera.zoom <= 0
  )
    throw new RangeError("Pointer mapping requires finite coordinates and positive dimensions.");
  const screenX = ((clientX - bounds.left) / bounds.width) * camera.viewportWidth;
  const screenY = ((clientY - bounds.top) / bounds.height) * camera.viewportHeight;
  return Object.freeze({
    x: camera.scrollX + screenX / camera.zoom,
    y: camera.scrollY + screenY / camera.zoom,
  });
}
