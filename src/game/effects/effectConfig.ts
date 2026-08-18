export const EFFECT_BUDGET = Object.freeze({ normal: 96, reducedMotion: 48 });

export function effectBudget(reducedMotion: boolean): number {
  return reducedMotion ? EFFECT_BUDGET.reducedMotion : EFFECT_BUDGET.normal;
}

export type EffectBudgetDecision = "acquire" | "reuse-oldest";

export function decideEffectAcquisition(activeCount: number, cap: number): EffectBudgetDecision {
  if (!Number.isInteger(activeCount) || activeCount < 0 || !Number.isInteger(cap) || cap <= 0) {
    throw new RangeError("Effect counts and caps must be positive bounded integers.");
  }
  return activeCount < cap ? "acquire" : "reuse-oldest";
}
