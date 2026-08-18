export function fullscreenLabel(isFullscreen: boolean): string {
  return isFullscreen ? "EXIT FULLSCREEN" : "ENTER FULLSCREEN";
}

export async function requestGameFullscreen(element: HTMLElement | undefined): Promise<boolean> {
  if (!element?.requestFullscreen) return false;
  try {
    await element.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}
