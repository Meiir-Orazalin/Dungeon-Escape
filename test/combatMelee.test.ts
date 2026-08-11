import { describe, expect, it } from "vitest";

import {
  beginAttack,
  createReadyAttackState,
  registerAttackHits,
  updateAttackState,
} from "../src/game/combat/attackState";
import { COMBAT_CONFIG } from "../src/game/combat/config";
import { DEFAULT_FACING, facingFromMovement, normalizeDirection } from "../src/game/combat/facing";
import {
  hasWalkableAttackLine,
  isTargetInsideMeleeSector,
  selectMeleeHits,
} from "../src/game/combat/melee";
import { generateDungeon } from "../src/game/dungeon/generateDungeon";

describe("facing and melee geometry", () => {
  it("uses east as the default facing", () => {
    expect(DEFAULT_FACING).toEqual({ x: 1, y: 0 });
  });

  it("updates facing from horizontal movement", () => {
    expect(
      facingFromMovement({ up: false, down: false, left: true, right: false }, DEFAULT_FACING),
    ).toEqual({ x: -1, y: 0 });
  });

  it("updates facing from vertical movement", () => {
    expect(
      facingFromMovement({ up: true, down: false, left: false, right: false }, DEFAULT_FACING),
    ).toEqual({ x: 0, y: -1 });
  });

  it("normalizes diagonal facing", () => {
    const facing = facingFromMovement(
      { up: false, down: true, left: false, right: true },
      DEFAULT_FACING,
    );
    expect(Math.hypot(facing.x, facing.y)).toBeCloseTo(1, 8);
  });

  it("preserves previous facing for zero movement", () => {
    expect(
      facingFromMovement({ up: false, down: false, left: false, right: false }, { x: 0, y: -1 }),
    ).toEqual({ x: 0, y: -1 });
  });

  it("defensively replaces zero or invalid facing", () => {
    expect(normalizeDirection({ x: 0, y: 0 }, { x: Number.NaN, y: 0 })).toEqual(DEFAULT_FACING);
  });

  it("hits a target directly inside range and arc", () => {
    expect(isTargetInsideMeleeSector({ x: 0, y: 0 }, DEFAULT_FACING, { x: 40, y: 0 }, 0)).toBe(
      true,
    );
  });

  it("rejects a target outside range", () => {
    expect(isTargetInsideMeleeSector({ x: 0, y: 0 }, DEFAULT_FACING, { x: 80, y: 0 }, 0)).toBe(
      false,
    );
  });

  it("rejects a target outside the attack arc", () => {
    expect(isTargetInsideMeleeSector({ x: 0, y: 0 }, DEFAULT_FACING, { x: 0, y: 40 }, 0)).toBe(
      false,
    );
  });

  it("includes the exact range boundary", () => {
    expect(
      isTargetInsideMeleeSector(
        { x: 0, y: 0 },
        DEFAULT_FACING,
        { x: COMBAT_CONFIG.attackRange, y: 0 },
        0,
      ),
    ).toBe(true);
  });

  it("includes the exact full-arc boundary", () => {
    const angle = (COMBAT_CONFIG.attackArcDegrees * Math.PI) / 360;
    expect(
      isTargetInsideMeleeSector(
        { x: 0, y: 0 },
        DEFAULT_FACING,
        { x: Math.cos(angle) * 40, y: Math.sin(angle) * 40 },
        0,
      ),
    ).toBe(true);
  });

  it("includes enemy collision radius in melee geometry", () => {
    expect(
      isTargetInsideMeleeSector(
        { x: 0, y: 0 },
        DEFAULT_FACING,
        { x: COMBAT_CONFIG.attackRange + 8, y: 0 },
        10,
      ),
    ).toBe(true);
  });

  it("rejects a target behind solid wall geometry", () => {
    const layout = generateDungeon("melee-occlusion");
    const wallIndex = layout.wallMask.findIndex((wall, index) => {
      if (!wall) return false;
      const x = index % layout.mapWidth;
      const y = Math.floor(index / layout.mapWidth);
      return [index - 1, index + 1, index - layout.mapWidth, index + layout.mapWidth].some(
        (candidate) => layout.floorMask[candidate] === true && x > 0 && y > 0,
      );
    });
    const wallX = wallIndex % layout.mapWidth;
    const wallY = Math.floor(wallIndex / layout.mapWidth);
    const neighbour = [
      { x: wallX - 1, y: wallY },
      { x: wallX + 1, y: wallY },
      { x: wallX, y: wallY - 1 },
      { x: wallX, y: wallY + 1 },
    ].find((point) => layout.floorMask[point.y * layout.mapWidth + point.x] === true);
    expect(neighbour).toBeDefined();
    expect(
      hasWalkableAttackLine(
        layout,
        {
          x: ((neighbour?.x ?? 0) + 0.5) * layout.tileSize,
          y: ((neighbour?.y ?? 0) + 0.5) * layout.tileSize,
        },
        { x: (wallX + 0.5) * layout.tileSize, y: (wallY + 0.5) * layout.tileSize },
      ),
    ).toBe(false);
  });

  it("registers one enemy at most once per attack instance", () => {
    const state = registerAttackHits(
      registerAttackHits({ ...createReadyAttackState(), phase: "active" }, ["enemy-a"]),
      ["enemy-a"],
    );
    expect([...state.hitEnemyIds]).toEqual(["enemy-a"]);
  });

  it("allows one attack to hit two genuine targets", () => {
    const layout = generateDungeon("melee-multiple");
    const origin = { x: layout.spawn.x, y: layout.spawn.y };
    expect(
      selectMeleeHits(
        layout,
        origin,
        DEFAULT_FACING,
        [
          { id: "a", position: { x: origin.x + 24, y: origin.y - 5 }, radius: 8, alive: true },
          { id: "b", position: { x: origin.x + 28, y: origin.y + 6 }, radius: 8, alive: true },
        ],
        new Set(),
      ),
    ).toEqual(["a", "b"]);
  });

  it("excludes dead enemies", () => {
    const layout = generateDungeon("melee-dead");
    expect(
      selectMeleeHits(
        layout,
        layout.spawn,
        DEFAULT_FACING,
        [
          {
            id: "dead",
            position: { x: layout.spawn.x + 20, y: layout.spawn.y },
            radius: 8,
            alive: false,
          },
        ],
        new Set(),
      ),
    ).toEqual([]);
  });

  it("transitions attack state through wind-up, active, recovery, cooldown, and ready", () => {
    let state = beginAttack(createReadyAttackState(), { dashing: false, hitStunned: false });
    expect(state.phase).toBe("wind-up");
    state = updateAttackState(state, COMBAT_CONFIG.attackWindUpMs);
    expect(state.phase).toBe("active");
    state = updateAttackState(state, COMBAT_CONFIG.attackActiveMs);
    expect(state.phase).toBe("recovery");
    state = updateAttackState(state, 100);
    state = updateAttackState(state, COMBAT_CONFIG.attackRecoveryMs - 100);
    expect(state.phase).toBe("cooldown");
    state = updateAttackState(state, 100);
    expect(state.phase).toBe("ready");
  });

  it("cannot begin another attack during cooldown or an existing attack", () => {
    const attacking = beginAttack(createReadyAttackState(), { dashing: false, hitStunned: false });
    expect(beginAttack(attacking, { dashing: false, hitStunned: false })).toBe(attacking);
  });

  it("cannot begin an attack while dashing or hit stunned", () => {
    const ready = createReadyAttackState();
    expect(beginAttack(ready, { dashing: true, hitStunned: false })).toBe(ready);
    expect(beginAttack(ready, { dashing: false, hitStunned: true })).toBe(ready);
  });

  it("defensively ignores invalid attack delta", () => {
    const state = beginAttack(createReadyAttackState(), { dashing: false, hitStunned: false });
    expect(updateAttackState(state, Number.NaN)).toBe(state);
    expect(updateAttackState(state, -10)).toBe(state);
  });
});
