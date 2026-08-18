export type FloorAmbienceId =
  "ambience-catacombs" | "ambience-ember-vaults" | "ambience-obsidian-sanctum";

export type AudioEffectId =
  | "ui-focus"
  | "ui-confirm"
  | "ui-back"
  | "sword-swing"
  | "dash"
  | "enemy-hit"
  | "enemy-defeat"
  | "player-hit"
  | "key-collected"
  | "gate-sealed"
  | "gate-ready"
  | "chest-open"
  | "shard-collected"
  | "flask-heal"
  | "forge-ready"
  | "upgrade-selected"
  | "floor-cleared"
  | "run-victory"
  | "run-defeat";

export interface EffectiveAudioGains {
  readonly master: number;
  readonly ambience: number;
  readonly effects: number;
}
