const STATUS_ELEMENT_ID = "game-state";

export function announceGameState(message: string): void {
  const statusElement = document.querySelector<HTMLElement>(`#${STATUS_ELEMENT_ID}`);

  if (statusElement) {
    statusElement.textContent = message;
  }
}
