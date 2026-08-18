export interface EffectVoice {
  readonly id: number;
  readonly critical: boolean;
  readonly startedSequence: number;
}

export type VoiceBudgetDecision =
  | Readonly<{ action: "accept" }>
  | Readonly<{ action: "replace"; voiceId: number }>
  | Readonly<{ action: "reject" }>;

export function decideEffectVoice(
  active: readonly EffectVoice[],
  cap: number,
  incomingCritical: boolean,
): VoiceBudgetDecision {
  if (!Number.isInteger(cap) || cap <= 0) throw new RangeError("Voice cap must be positive.");
  if (active.length < cap) return Object.freeze({ action: "accept" });
  const replaceable = [...active]
    .filter((voice) => !voice.critical)
    .sort((left, right) => left.startedSequence - right.startedSequence || left.id - right.id)[0];
  if (replaceable) return Object.freeze({ action: "replace", voiceId: replaceable.id });
  return incomingCritical
    ? Object.freeze({ action: "replace", voiceId: active[0]?.id ?? -1 })
    : Object.freeze({ action: "reject" });
}
