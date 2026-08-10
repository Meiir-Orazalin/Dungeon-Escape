export interface MovementInput {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
}

export interface MovementVelocity {
  readonly x: number;
  readonly y: number;
}

export function calculateMovementVelocity(input: MovementInput, speed: number): MovementVelocity {
  const horizontal = Number(input.right) - Number(input.left);
  const vertical = Number(input.down) - Number(input.up);
  const magnitude = Math.hypot(horizontal, vertical);

  if (magnitude === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (horizontal / magnitude) * speed,
    y: (vertical / magnitude) * speed,
  };
}
