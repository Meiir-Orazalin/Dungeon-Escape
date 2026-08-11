import type { DashState } from "./types";

export interface HealthPips {
  readonly full: number;
  readonly empty: number;
}

export function deriveHealthPips(health: number, maximum: number): HealthPips {
  const safeMaximum = Math.max(0, Number.isFinite(maximum) ? Math.floor(maximum) : 0);
  const full = Math.max(0, Math.min(safeMaximum, Number.isFinite(health) ? Math.floor(health) : 0));
  return Object.freeze({ full, empty: safeMaximum - full });
}

export function formatEnemyCount(defeated: number, total: number): string {
  const safeTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const safeDefeated = Math.max(
    0,
    Math.min(safeTotal, Math.floor(Number.isFinite(defeated) ? defeated : 0)),
  );
  return `${safeDefeated} / ${safeTotal}`;
}

export function formatDashStatus(state: DashState): string {
  if (state.status === "ready") return "READY";
  if (state.status === "active") return "DASHING";
  return `${Math.max(0, Math.ceil(state.cooldownRemainingMs / 100) / 10).toFixed(1)}S`;
}
