export function classifyProductionChunk(moduleId: string): string | undefined {
  const normalized = moduleId.replaceAll("\\", "/");
  return normalized.includes("/node_modules/phaser/") ? "phaser-vendor" : undefined;
}

export function assertFiniteBudget(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(`${label} must be finite and non-negative.`);
  return value;
}

export function totalBytes(values: readonly number[]): number {
  return values.reduce((total, value) => total + assertFiniteBudget(value, "Asset byte size"), 0);
}
