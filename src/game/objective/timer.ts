export function sanitizeElapsedTime(elapsedTimeMs: number): number {
  return Number.isFinite(elapsedTimeMs) && elapsedTimeMs > 0 ? elapsedTimeMs : 0;
}

export function formatElapsedTime(elapsedTimeMs: number): string {
  const totalSeconds = Math.floor(sanitizeElapsedTime(elapsedTimeMs) / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
