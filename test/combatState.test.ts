import { describe, expect, it } from "vitest";

import { COMBAT_CONFIG } from "../src/game/combat/config";
import { beginDash, createReadyDashState, updateDashState } from "../src/game/combat/dashState";
import { createKnockback, updateKnockback } from "../src/game/combat/knockback";
import { createActiveRunOutcome, transitionRunOutcome } from "../src/game/combat/runOutcome";
import type { DashState, PlayerVitality } from "../src/game/combat/types";
import {
  applyPlayerDamage,
  createInitialVitality,
  updateVitality,
} from "../src/game/combat/vitality";

function advanceDash(state: DashState, duration: number, step = 50): DashState {
  let next = state;
  for (let elapsed = 0; elapsed < duration; elapsed += step) {
    next = updateDashState(next, Math.min(step, duration - elapsed));
  }
  return next;
}

function advanceVitality(state: PlayerVitality, duration: number, step = 50): PlayerVitality {
  let next = state;
  for (let elapsed = 0; elapsed < duration; elapsed += step) {
    next = updateVitality(next, Math.min(step, duration - elapsed));
  }
  return next;
}

describe("dash transitions", () => {
  it("uses non-zero movement input as dash direction", () => {
    const state = beginDash(createReadyDashState(), { x: 0, y: -1 }, { x: 1, y: 0 }, false);
    expect(state.status === "active" ? state.direction : null).toEqual({ x: 0, y: -1 });
  });

  it("falls back to facing when movement is zero", () => {
    const state = beginDash(createReadyDashState(), { x: 0, y: 0 }, { x: -1, y: 0 }, false);
    expect(state.status === "active" ? state.direction : null).toEqual({ x: -1, y: 0 });
  });

  it("normalizes the dash direction", () => {
    const state = beginDash(createReadyDashState(), { x: 1, y: 1 }, { x: 1, y: 0 }, false);
    expect(
      state.status === "active" ? Math.hypot(state.direction.x, state.direction.y) : 0,
    ).toBeCloseTo(1, 8);
  });

  it("safely replaces zero and invalid directions", () => {
    const state = beginDash(createReadyDashState(), { x: Number.NaN, y: 0 }, { x: 0, y: 0 }, false);
    expect(state.status === "active" ? state.direction : null).toEqual({ x: 1, y: 0 });
  });

  it("transitions from active through cooldown", () => {
    const state = beginDash(createReadyDashState(), { x: 1, y: 0 }, { x: 1, y: 0 }, false);
    expect(state.status).toBe("active");
    expect(advanceDash(state, COMBAT_CONFIG.dashDurationMs).status).toBe("cooldown");
  });

  it("ends the active dash after its configured duration", () => {
    const state = beginDash(createReadyDashState(), { x: 1, y: 0 }, { x: 1, y: 0 }, false);
    expect(advanceDash(state, COMBAT_CONFIG.dashDurationMs - 1).status).toBe("active");
    expect(advanceDash(state, COMBAT_CONFIG.dashDurationMs).status).toBe("cooldown");
  });

  it("cannot restart while active", () => {
    const active = beginDash(createReadyDashState(), { x: 1, y: 0 }, { x: 1, y: 0 }, false);
    expect(beginDash(active, { x: -1, y: 0 }, { x: 1, y: 0 }, false)).toBe(active);
  });

  it("cannot restart during cooldown", () => {
    const active = beginDash(createReadyDashState(), { x: 1, y: 0 }, { x: 1, y: 0 }, false);
    const cooldown = advanceDash(active, COMBAT_CONFIG.dashDurationMs);
    expect(beginDash(cooldown, { x: -1, y: 0 }, { x: 1, y: 0 }, false)).toBe(cooldown);
  });

  it("becomes ready after its full cooldown", () => {
    const active = beginDash(createReadyDashState(), { x: 1, y: 0 }, { x: 1, y: 0 }, false);
    expect(advanceDash(active, COMBAT_CONFIG.dashCooldownMs).status).toBe("ready");
  });

  it("reset creates a dash-ready state", () => {
    expect(createReadyDashState()).toEqual({ status: "ready" });
  });

  it("is frame-rate independent across representative delta sequences", () => {
    const active = beginDash(createReadyDashState(), { x: 1, y: 1 }, { x: 1, y: 0 }, false);
    expect(advanceDash(active, 260, 10)).toEqual(advanceDash(active, 260, 65));
  });
});

describe("player vitality", () => {
  it("starts at maximum health", () => {
    const state = createInitialVitality();
    expect(state.health).toBe(state.maximumHealth);
  });

  it("accepted damage reduces health by one", () => {
    expect(applyPlayerDamage(createInitialVitality(), 1, false).state.health).toBe(4);
  });

  it("never permits health below zero", () => {
    expect(applyPlayerDamage(createInitialVitality(), 99, false).state.health).toBe(0);
  });

  it("ignores damage during post-hit invulnerability", () => {
    const damaged = applyPlayerDamage(createInitialVitality(), 1, false).state;
    expect(applyPlayerDamage(damaged, 1, false).outcome).toBe("ignored");
  });

  it("ignores damage during a dash", () => {
    expect(applyPlayerDamage(createInitialVitality(), 1, true).outcome).toBe("ignored");
  });

  it("ignored damage leaves health unchanged", () => {
    const state = createInitialVitality();
    expect(applyPlayerDamage(state, 1, true).state.health).toBe(state.health);
  });

  it("accepted damage begins invulnerability", () => {
    const state = applyPlayerDamage(createInitialVitality(), 1, false).state;
    expect(state.status === "alive" ? state.invulnerabilityRemainingMs : 0).toBe(
      COMBAT_CONFIG.postDamageInvulnerabilityMs,
    );
  });

  it("invulnerability expires after the configured duration", () => {
    const damaged = applyPlayerDamage(createInitialVitality(), 1, false).state;
    const advanced = advanceVitality(damaged, COMBAT_CONFIG.postDamageInvulnerabilityMs);
    expect(advanced.status === "alive" ? advanced.invulnerabilityRemainingMs : -1).toBe(0);
  });

  it("accepted damage begins hit stun", () => {
    const state = applyPlayerDamage(createInitialVitality(), 1, false).state;
    expect(state.status === "alive" ? state.hitStunRemainingMs : 0).toBe(COMBAT_CONFIG.hitStunMs);
  });

  it("hit stun expires", () => {
    const damaged = applyPlayerDamage(createInitialVitality(), 1, false).state;
    const advanced = advanceVitality(damaged, COMBAT_CONFIG.hitStunMs);
    expect(advanced.status === "alive" ? advanced.hitStunRemainingMs : -1).toBe(0);
  });

  it("damage at one health produces defeated state", () => {
    const oneHealth: PlayerVitality = {
      status: "alive",
      health: 1,
      maximumHealth: 5,
      invulnerabilityRemainingMs: 0,
      hitStunRemainingMs: 0,
    };
    expect(applyPlayerDamage(oneHealth, 1, false).state.status).toBe("defeated");
  });

  it("reports defeat exactly on the terminal accepted hit", () => {
    const oneHealth: PlayerVitality = {
      status: "alive",
      health: 1,
      maximumHealth: 5,
      invulnerabilityRemainingMs: 0,
      hitStunRemainingMs: 0,
    };
    expect(applyPlayerDamage(oneHealth, 1, false).outcome).toBe("defeated");
  });

  it("ignores damage after defeat", () => {
    const defeated: PlayerVitality = { status: "defeated", health: 0, maximumHealth: 5 };
    expect(applyPlayerDamage(defeated, 1, false)).toEqual({ state: defeated, outcome: "ignored" });
  });

  it("reset restores full alive vitality", () => {
    expect(createInitialVitality()).toEqual({
      status: "alive",
      health: 5,
      maximumHealth: 5,
      invulnerabilityRemainingMs: 0,
      hitStunRemainingMs: 0,
    });
  });

  it("defensively ignores invalid damage values", () => {
    const state = createInitialVitality();
    expect(applyPlayerDamage(state, 0, false).outcome).toBe("ignored");
    expect(applyPlayerDamage(state, Number.NaN, false).outcome).toBe("ignored");
    expect(applyPlayerDamage(state, 1.5, false).outcome).toBe("ignored");
  });
});

describe("knockback", () => {
  it("points away from the damage source", () => {
    const knockback = createKnockback({ x: 10, y: 0 }, { x: 0, y: 0 });
    expect(knockback.velocity.x).toBeGreaterThan(0);
  });

  it("always creates a finite vector", () => {
    const knockback = createKnockback({ x: 10, y: 5 }, { x: 0, y: 0 });
    expect([knockback.velocity.x, knockback.velocity.y].every(Number.isFinite)).toBe(true);
  });

  it("uses a stable fallback for coincident positions", () => {
    expect(createKnockback({ x: 0, y: 0 }, { x: 0, y: 0 }).velocity).toEqual({ x: 250, y: 0 });
  });

  it("expires after its duration", () => {
    const knockback = createKnockback({ x: 10, y: 0 }, { x: 0, y: 0 }, 250, 100);
    expect(updateKnockback(knockback, 100)).toBeNull();
  });

  it("reset clears knockback by returning no state", () => {
    expect(updateKnockback(null, 50)).toBeNull();
  });
});

describe("run outcome", () => {
  it("starts active", () => {
    expect(createActiveRunOutcome()).toBe("active");
  });

  it("valid escape transitions active to escaped", () => {
    expect(transitionRunOutcome("active", "escape")).toBe("escaped");
  });

  it("zero-health defeat transitions active to defeated", () => {
    expect(transitionRunOutcome("active", "defeat")).toBe("defeated");
  });

  it("escaped cannot become defeated", () => {
    expect(transitionRunOutcome("escaped", "defeat")).toBe("escaped");
  });

  it("defeated cannot become escaped", () => {
    expect(transitionRunOutcome("defeated", "escape")).toBe("defeated");
  });

  it("repeated terminal transitions are idempotent", () => {
    expect(transitionRunOutcome("escaped", "escape")).toBe("escaped");
    expect(transitionRunOutcome("defeated", "defeat")).toBe("defeated");
  });

  it("reset creates an active outcome", () => {
    expect(transitionRunOutcome("defeated", "reset")).toBe("active");
  });
});
