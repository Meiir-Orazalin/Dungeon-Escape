import { describe, expect, it } from "vitest";

import { calculateMovementVelocity, type MovementInput } from "../src/game/input/movement";

const SPEED = 240;
const NO_INPUT: MovementInput = {
  up: false,
  down: false,
  left: false,
  right: false,
};

describe("calculateMovementVelocity", () => {
  it("returns zero velocity when there is no input", () => {
    expect(calculateMovementVelocity(NO_INPUT, SPEED)).toEqual({ x: 0, y: 0 });
  });

  it("returns full horizontal speed", () => {
    expect(calculateMovementVelocity({ ...NO_INPUT, right: true }, SPEED)).toEqual({
      x: SPEED,
      y: 0,
    });
  });

  it("returns full vertical speed", () => {
    expect(calculateMovementVelocity({ ...NO_INPUT, up: true }, SPEED)).toEqual({
      x: 0,
      y: -SPEED,
    });
  });

  it("normalizes diagonal movement to the configured speed", () => {
    const velocity = calculateMovementVelocity({ ...NO_INPUT, up: true, right: true }, SPEED);

    expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(SPEED, 8);
    expect(velocity.x).toBeCloseTo(SPEED / Math.SQRT2, 8);
    expect(velocity.y).toBeCloseTo(-SPEED / Math.SQRT2, 8);
  });

  it("cancels opposing horizontal and vertical inputs", () => {
    expect(
      calculateMovementVelocity({ up: true, down: true, left: true, right: true }, SPEED),
    ).toEqual({ x: 0, y: 0 });
  });
});
