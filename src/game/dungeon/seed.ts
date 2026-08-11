import { DUNGEON_CONFIG } from "./config";

const FALLBACK_SEED = "forgotten-vault";

export function normalizeSeed(input: string): string {
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, DUNGEON_CONFIG.maxSeedLength)
    .replace(/[-_]+$/g, "");

  return normalized || FALLBACK_SEED;
}

export function hashSeed(input: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function seedFromSearch(search: string): string | null {
  try {
    const rawSeed = new URLSearchParams(search).get("seed");
    return rawSeed?.trim() ? normalizeSeed(rawSeed) : null;
  } catch {
    return null;
  }
}

export function deriveAttemptState(seed: string, zeroBasedAttempt: number): number {
  if (!Number.isInteger(zeroBasedAttempt) || zeroBasedAttempt < 0) {
    throw new RangeError("The generation attempt must be a non-negative integer.");
  }

  return hashSeed(`${normalizeSeed(seed)}::attempt-${zeroBasedAttempt}`);
}
