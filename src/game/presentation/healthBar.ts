export function healthBarRatio(current: number, maximum: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(maximum) || maximum <= 0) return 0;
  return Math.min(1, Math.max(0, current / maximum));
}

export function enemyHealthBarWidth(archetype: string): number {
  return archetype === "stone-warden" ? 48 : 36;
}

export function shouldShowEnemyHealthBar(
  discovered: boolean,
  engaged: boolean,
  alive: boolean,
  damageVisibilityRemainingMs: number,
): boolean {
  return alive && discovered && (engaged || damageVisibilityRemainingMs > 0);
}
