export const ENEMY_AWAKENING_MS = 450;

export type EnemyAwakeningState =
  | Readonly<{ status: "dormant"; consumed: false; remainingMs: 0 }>
  | Readonly<{ status: "awakening"; consumed: true; remainingMs: number }>
  | Readonly<{ status: "active"; consumed: true; remainingMs: 0 }>
  | Readonly<{ status: "dead"; consumed: true; remainingMs: 0 }>;

export function createEnemyAwakeningState(): EnemyAwakeningState {
  return Object.freeze({ status: "dormant", consumed: false, remainingMs: 0 });
}

export function updateEnemyAwakening(
  state: EnemyAwakeningState,
  input: Readonly<{ discovered: boolean; dead: boolean; deltaMs: number }>,
): EnemyAwakeningState {
  if (input.dead) return Object.freeze({ status: "dead", consumed: true, remainingMs: 0 });
  if (state.status === "dead" || state.status === "active") return state;
  if (state.status === "dormant") {
    if (!input.discovered) return state;
    return Object.freeze({ status: "awakening", consumed: true, remainingMs: ENEMY_AWAKENING_MS });
  }
  const delta = Number.isFinite(input.deltaMs) && input.deltaMs > 0 ? input.deltaMs : 0;
  const remainingMs = Math.max(0, state.remainingMs - delta);
  return remainingMs === 0
    ? Object.freeze({ status: "active", consumed: true, remainingMs: 0 })
    : Object.freeze({ status: "awakening", consumed: true, remainingMs });
}

export function enemyCanAct(state: EnemyAwakeningState): boolean {
  return state.status === "active";
}
