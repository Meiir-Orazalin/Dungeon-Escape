import { describe, expect, it } from "vitest";

import {
  createAshWispState,
  createProjectileDirection,
  createStoneWardenState,
  decideBoneStalker,
  stableDirection,
  updateAshWisp,
  updateProjectileLifetime,
  updateStoneWarden,
} from "../src/game/enemies/enemyBrain";
import { ASH_WISP_CONFIG, STONE_WARDEN_CONFIG } from "../src/game/enemies/enemyConfig";
import type { AshWispState, EnemyDecisionInput, StoneWardenState } from "../src/game/enemies/types";

const baseInput: EnemyDecisionInput = {
  discovered: true,
  playerInHomeRoom: true,
  dead: false,
  position: { x: 0, y: 0 },
  spawnPosition: { x: 0, y: 0 },
  playerPosition: { x: 180, y: 0 },
};

function advanceWisp(state: AshWispState, duration: number) {
  let next = state;
  let shots = 0;
  for (let elapsed = 0; elapsed < duration; elapsed += 50) {
    const transition = updateAshWisp(next, baseInput, Math.min(50, duration - elapsed));
    next = transition.state;
    shots += Number(transition.fireProjectile);
  }
  return { state: next, shots };
}

function advanceWarden(state: StoneWardenState, duration: number, input = baseInput) {
  let next = state;
  let velocity = { x: 0, y: 0 };
  for (let elapsed = 0; elapsed < duration; elapsed += 50) {
    const transition = updateStoneWarden(next, input, Math.min(50, duration - elapsed));
    next = transition.state;
    velocity = transition.velocity;
  }
  return { state: next, velocity };
}

describe("Bone Stalker decisions", () => {
  it("keeps an undiscovered Stalker dormant", () => {
    expect(decideBoneStalker({ ...baseInput, discovered: false }).state).toBe("dormant");
  });

  it("keeps a discovered Stalker idle outside its room when already home", () => {
    expect(decideBoneStalker({ ...baseInput, playerInHomeRoom: false }).state).toBe("idle");
  });

  it("engages chase when the player enters its room", () => {
    expect(decideBoneStalker(baseInput).state).toBe("chase");
  });

  it("returns home when the player leaves", () => {
    expect(
      decideBoneStalker({
        ...baseInput,
        playerInHomeRoom: false,
        position: { x: 50, y: 0 },
      }).state,
    ).toBe("return");
  });

  it("becomes idle after returning near spawn", () => {
    expect(
      decideBoneStalker({
        ...baseInput,
        playerInHomeRoom: false,
        position: { x: 3, y: 2 },
      }).state,
    ).toBe("idle");
  });

  it("produces no movement after death", () => {
    expect(decideBoneStalker({ ...baseInput, dead: true })).toEqual({
      state: "dead",
      velocity: { x: 0, y: 0 },
    });
  });
});

describe("Ash Wisp decisions and projectile timing", () => {
  it("keeps an undiscovered Wisp dormant", () => {
    expect(
      updateAshWisp(createAshWispState(), { ...baseInput, discovered: false }, 50).state.mode,
    ).toBe("dormant");
  });

  it("retreats when the player is too close", () => {
    const state = { ...createAshWispState(), shotCooldownRemainingMs: 1_000 };
    expect(
      updateAshWisp(state, { ...baseInput, playerPosition: { x: 80, y: 0 } }, 10).state.mode,
    ).toBe("retreat");
  });

  it("approaches when the player is too far", () => {
    const state = { ...createAshWispState(), shotCooldownRemainingMs: 1_000 };
    expect(
      updateAshWisp(state, { ...baseInput, playerPosition: { x: 280, y: 0 } }, 10).state.mode,
    ).toBe("approach");
  });

  it("holds inside preferred range", () => {
    const state = { ...createAshWispState(), shotCooldownRemainingMs: 1_000 };
    expect(updateAshWisp(state, baseInput, 10).state.mode).toBe("hold");
  });

  it("enters telegraph after cooldown", () => {
    const state = { ...createAshWispState(), shotCooldownRemainingMs: 1 };
    expect(updateAshWisp(state, baseInput, 1).state.mode).toBe("telegraph");
  });

  it("locks a deterministic firing direction", () => {
    const state = { ...createAshWispState(), shotCooldownRemainingMs: 0 };
    const first = updateAshWisp(state, baseInput, 1).state.lockedDirection;
    const second = updateAshWisp(state, baseInput, 1).state.lockedDirection;
    expect(first).toEqual(second);
  });

  it("telegraph completion requests exactly one projectile", () => {
    const telegraph = updateAshWisp(
      { ...createAshWispState(), shotCooldownRemainingMs: 0 },
      baseInput,
      1,
    ).state;
    expect(advanceWisp(telegraph, ASH_WISP_CONFIG.shotTelegraphMs).shots).toBe(1);
  });

  it("player leaving the room cancels unfinished telegraph", () => {
    const telegraph: AshWispState = {
      ...createAshWispState(),
      mode: "telegraph",
      telegraphRemainingMs: 200,
    };
    const transition = updateAshWisp(telegraph, { ...baseInput, playerInHomeRoom: false }, 20);
    expect(transition.state.mode).toBe("idle");
    expect(transition.fireProjectile).toBe(false);
  });

  it("Wisp death cancels unfinished telegraph", () => {
    const telegraph: AshWispState = {
      ...createAshWispState(),
      mode: "telegraph",
      telegraphRemainingMs: 200,
    };
    expect(updateAshWisp(telegraph, { ...baseInput, dead: true }, 20).state.mode).toBe("dead");
  });

  it("projectile lifetime expires deterministically", () => {
    let remaining: number = ASH_WISP_CONFIG.projectileLifetimeMs;
    for (let index = 0; index < 22; index += 1)
      remaining = updateProjectileLifetime(remaining, 100);
    expect(remaining).toBe(0);
  });

  it("normalizes projectile direction", () => {
    const direction = createProjectileDirection({ x: 0, y: 0 }, { x: 4, y: 3 });
    expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1, 8);
  });

  it("handles invalid projectile direction safely", () => {
    expect(stableDirection({ x: Number.NaN, y: 0 })).toEqual({ x: 1, y: 0 });
  });
});

describe("Stone Warden decisions", () => {
  it("keeps an undiscovered Warden dormant", () => {
    expect(
      updateStoneWarden(createStoneWardenState(), { ...baseInput, discovered: false }, 50).state
        .mode,
    ).toBe("dormant");
  });

  it("approaches before entering charge range", () => {
    expect(
      updateStoneWarden(
        createStoneWardenState(),
        { ...baseInput, playerPosition: { x: 400, y: 0 } },
        50,
      ).state.mode,
    ).toBe("approach");
  });

  it("enters wind-up when charge conditions are met", () => {
    expect(updateStoneWarden(createStoneWardenState(), baseInput, 50).state.mode).toBe("wind-up");
  });

  it("wind-up locks a direction", () => {
    const state = updateStoneWarden(createStoneWardenState(), baseInput, 50).state;
    expect(state.lockedDirection).toEqual({ x: 1, y: 0 });
  });

  it("wind-up completion enters charge", () => {
    const windUp = updateStoneWarden(createStoneWardenState(), baseInput, 1).state;
    expect(advanceWarden(windUp, STONE_WARDEN_CONFIG.chargeWindUpMs).state.mode).toBe("charge");
  });

  it("charge does not steer", () => {
    const charging: StoneWardenState = {
      mode: "charge",
      remainingMs: 300,
      lockedDirection: { x: 1, y: 0 },
    };
    const transition = updateStoneWarden(
      charging,
      { ...baseInput, playerPosition: { x: 0, y: 180 } },
      50,
    );
    expect(transition.velocity.y).toBe(0);
    expect(transition.velocity.x).toBe(STONE_WARDEN_CONFIG.chargeSpeed);
  });

  it("charge duration ends in recovery", () => {
    const charging: StoneWardenState = {
      mode: "charge",
      remainingMs: STONE_WARDEN_CONFIG.chargeDurationMs,
      lockedDirection: { x: 1, y: 0 },
    };
    expect(advanceWarden(charging, STONE_WARDEN_CONFIG.chargeDurationMs).state.mode).toBe(
      "recover",
    );
  });

  it("wall impact enters recovery", () => {
    const charging: StoneWardenState = {
      mode: "charge",
      remainingMs: 300,
      lockedDirection: { x: 1, y: 0 },
    };
    expect(updateStoneWarden(charging, baseInput, 10, { wallImpact: true }).state.mode).toBe(
      "recover",
    );
  });

  it("sword interruption enters recovery", () => {
    const windUp: StoneWardenState = {
      mode: "wind-up",
      remainingMs: 300,
      lockedDirection: { x: 1, y: 0 },
    };
    expect(updateStoneWarden(windUp, baseInput, 10, { swordInterrupted: true }).state.mode).toBe(
      "recover",
    );
  });

  it("recovery returns to approach", () => {
    const recovery: StoneWardenState = {
      mode: "recover",
      remainingMs: STONE_WARDEN_CONFIG.recoveryMs,
      lockedDirection: { x: 1, y: 0 },
    };
    expect(advanceWarden(recovery, STONE_WARDEN_CONFIG.recoveryMs).state.mode).toBe("approach");
  });

  it("player leaving during wind-up cancels into return behavior", () => {
    const windUp: StoneWardenState = {
      mode: "wind-up",
      remainingMs: 300,
      lockedDirection: { x: 1, y: 0 },
    };
    expect(
      updateStoneWarden(windUp, { ...baseInput, playerInHomeRoom: false }, 10).state.mode,
    ).toBe("idle");
  });

  it("dead Warden remains inactive", () => {
    expect(updateStoneWarden(createStoneWardenState(), { ...baseInput, dead: true }, 10)).toEqual({
      state: { mode: "dead", remainingMs: 0, lockedDirection: { x: 1, y: 0 } },
      velocity: { x: 0, y: 0 },
    });
  });
});
