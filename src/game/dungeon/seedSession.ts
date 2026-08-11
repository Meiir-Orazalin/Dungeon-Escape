import { hashSeed, normalizeSeed, seedFromSearch } from "./seed";

export const ACTIVE_SEED_REGISTRY_KEY = "active-dungeon-seed";

const ADJECTIVES = [
  "ashen",
  "brass",
  "cinder",
  "dusken",
  "ember",
  "hollow",
  "moss",
  "silent",
] as const;

const PLACES = [
  "archive",
  "bastion",
  "crypt",
  "gallery",
  "keep",
  "sanctum",
  "vault",
  "warren",
] as const;

function cryptoValue(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] as number;
}

export function createFriendlySeed(previousSeed?: string): string {
  const previous = previousSeed ? normalizeSeed(previousSeed) : null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const value = cryptoValue();
    const adjective = ADJECTIVES[value % ADJECTIVES.length];
    const place = PLACES[(value >>> 4) % PLACES.length];
    const suffix = (value >>> 8).toString(16).padStart(6, "0").slice(0, 6);
    const candidate = normalizeSeed(`${adjective}-${place}-${suffix}`);
    if (candidate !== previous) return candidate;
  }

  return `dungeon-${(hashSeed(previous ?? "new-dungeon") ^ 0x9e3779b9)
    .toString(16)
    .padStart(8, "0")}`;
}

export function resolveInitialSeed(search: string): string {
  return seedFromSearch(search) ?? createFriendlySeed();
}

export function replaceSeedInUrl(seed: string): void {
  try {
    const url = new URL(window.location.href);
    const normalizedSeed = normalizeSeed(seed);
    if (url.searchParams.get("seed") === normalizedSeed) return;
    url.searchParams.set("seed", normalizedSeed);
    window.history.replaceState(null, "", url);
  } catch {
    // A restricted embedding may not expose a mutable URL. Gameplay remains deterministic.
  }
}
