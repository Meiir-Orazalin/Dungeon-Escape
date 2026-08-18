const GAMEPLAY_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  " ",
  "Shift",
  "e",
  "f",
  "h",
  "j",
  "m",
  "n",
  "r",
  "w",
  "a",
  "s",
  "d",
]);
const ONE_SHOT_KEYS = new Set([" ", "Shift", "Escape", "e", "f", "h", "j", "m", "n", "r"]);

export function shouldPreventGameKeyDefault(key: string, gameOwnsInput: boolean): boolean {
  return gameOwnsInput && GAMEPLAY_KEYS.has(key.length === 1 ? key.toLowerCase() : key);
}

export function acceptsOneShotKey(key: string, repeat: boolean): boolean {
  const normalized = key.length === 1 ? key.toLowerCase() : key;
  return !repeat || !ONE_SHOT_KEYS.has(normalized);
}
