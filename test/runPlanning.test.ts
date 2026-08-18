import { describe, expect, it } from "vitest";

import { COMBAT_CONFIG } from "../src/game/combat/config";
import { generateDungeon } from "../src/game/dungeon/generateDungeon";
import { normalizeSeed } from "../src/game/dungeon/seed";
import { createEncounterPlan } from "../src/game/encounters/createEncounterPlan";
import { ENEMY_ARCHETYPE_CONFIG } from "../src/game/encounters/config";
import { ASH_WISP_CONFIG, STONE_WARDEN_CONFIG } from "../src/game/enemies/enemyConfig";
import { createLootPlan } from "../src/game/loot/createLootPlan";
import { createEscapeObjective } from "../src/game/objective/createEscapeObjective";
import { createRunPlan } from "../src/game/run/createRunPlan";
import {
  deriveEffectiveEnemyStats,
  FLOOR_DIFFICULTIES,
  getFloorDifficulty,
} from "../src/game/run/difficulty";
import { deriveFloorSeed, deriveFloorSeeds } from "../src/game/run/floorSeeds";
import { recomputeRunFingerprint } from "../src/game/run/fingerprint";
import { FLOOR_THEMES, getFloorTheme } from "../src/game/run/themes";
import type { FloorPlanBundle, RunPlan } from "../src/game/run/types";
import { validateRunPlan } from "../src/game/run/validateRunPlan";
import { UPGRADE_CATALOG, UPGRADE_IDS } from "../src/game/upgrades/catalog";
import { BASE_PLAYER_STATS, deriveEffectivePlayerStats } from "../src/game/upgrades/effectiveStats";
import { createUpgradeOffer } from "../src/game/upgrades/offer";

describe("Phase 6 floor seeds and RunPlan", () => {
  it("derives three stable, normalized, unique floor seeds", () => {
    const runSeed = "phase6-long_seed-with-useful-characters-123456789";
    const first = deriveFloorSeeds(runSeed);
    expect(deriveFloorSeeds(runSeed)).toEqual(first);
    expect(first[0]?.seed).toBe(normalizeSeed(runSeed));
    expect(new Set(first.map(({ seed }) => seed)).size).toBe(3);
    first.forEach(({ seed }) => {
      expect(seed).toMatch(/^[a-z0-9_-]+$/);
      expect(seed.length).toBeLessThanOrEqual(48);
    });
    expect(deriveFloorSeed(runSeed, 2)).not.toBe(deriveFloorSeed(runSeed, 3));
    expect(() => deriveFloorSeed(runSeed, 4 as 1)).toThrow(/floors 1, 2, and 3/);
  });

  it("produces deeply equivalent plans and separate run fingerprints", () => {
    const first = createRunPlan("phase6-plan-repeat");
    const second = createRunPlan("phase6-plan-repeat");
    expect(second).toEqual(first);
    expect(first.fingerprint).toMatch(/^rn-[0-9a-f]{8}$/);
    expect(first.floors).toHaveLength(3);
    expect(first.floors.map((floor) => floor.floorNumber)).toEqual([1, 2, 3]);
    expect(new Set(first.floors.map((floor) => floor.floorSeed)).size).toBe(3);
    expect(first.fingerprint).not.toBe(first.floors[0]?.layout.fingerprint);
  });

  it("normally varies run and derived floor fingerprints", () => {
    const plans = ["phase6-alpha", "phase6-beta", "phase6-gamma"].map(createRunPlan);
    expect(new Set(plans.map((plan) => plan.fingerprint)).size).toBe(3);
    expect(new Set(plans.map((plan) => plan.floors[1]?.floorSeed)).size).toBe(3);
  });

  it("preserves direct Phase 5 planning compatibility on Floor 1", () => {
    const seed = "phase6-floor-one-compatibility";
    const run = createRunPlan(seed);
    const layout = generateDungeon(seed);
    const objective = createEscapeObjective(layout);
    const encounter = createEncounterPlan(layout, objective);
    const loot = createLootPlan(layout, objective, encounter);
    expect(run.floors[0]?.floorSeed).toBe(seed);
    expect(run.floors[0]?.layout.fingerprint).toBe(layout.fingerprint);
    expect(run.floors[0]?.objective.fingerprint).toBe(objective.fingerprint);
    expect(run.floors[0]?.encounter.fingerprint).toBe(encounter.fingerprint);
    expect(run.floors[0]?.loot.fingerprint).toBe(loot.fingerprint);
  });

  it("detects changed ordering, theme, difficulty, and fingerprint", () => {
    const plan = createRunPlan("phase6-validation-tampering");
    const swapped = [plan.floors[1]!, plan.floors[0]!, plan.floors[2]!] as const;
    const reordered: RunPlan = { ...plan, floors: swapped };
    expect(validateRunPlan(reordered).errors.join(" ")).toMatch(
      /fingerprint|floor numbers|derivation/,
    );

    const changedFloor: FloorPlanBundle = {
      ...plan.floors[0]!,
      difficulty: { ...plan.floors[0]!.difficulty, enemyMovementSpeedMultiplier: 1.01 },
    };
    const changed = [changedFloor, plan.floors[1]!, plan.floors[2]!] as const;
    expect(recomputeRunFingerprint(plan.runSeed, changed)).not.toBe(plan.fingerprint);

    const wrongTheme = {
      ...plan,
      fingerprint: recomputeRunFingerprint(plan.runSeed, [
        { ...plan.floors[0]!, theme: getFloorTheme(2) },
        plan.floors[1]!,
        plan.floors[2]!,
      ]),
      floors: [{ ...plan.floors[0]!, theme: getFloorTheme(2) }, plan.floors[1]!, plan.floors[2]!],
    } as RunPlan;
    expect(validateRunPlan(wrongTheme).errors.join(" ")).toMatch(/theme/);
  });

  it("validates 100 deterministic RunPlans and 300 complete floor bundles", () => {
    const plans = Array.from({ length: 100 }, (_, index) =>
      createRunPlan(`phase6-contract-${String(index).padStart(3, "0")}`),
    );
    expect(plans).toHaveLength(100);
    expect(plans.flatMap((plan) => plan.floors)).toHaveLength(300);
    plans.forEach((plan) => {
      expect(validateRunPlan(plan)).toEqual({ valid: true, errors: [] });
      plan.floors.forEach((floor) => {
        expect(floor.loot.chests).toHaveLength(3);
        expect(floor.loot.totalPlannedShards).toBeGreaterThanOrEqual(14);
        expect(floor.layout.fingerprint).toMatch(/^dg-[0-9a-f]{8}$/);
        expect(floor.objective.fingerprint).toMatch(/^eo-[0-9a-f]{8}$/);
        expect(floor.encounter.fingerprint).toMatch(/^ec-[0-9a-f]{8}$/);
        expect(floor.loot.fingerprint).toMatch(/^lt-[0-9a-f]{8}$/);
      });
    });
  });
});

describe("Phase 6 themes and difficulty", () => {
  it("has exactly three immutable, ordered presentation-only themes", () => {
    expect(FLOOR_THEMES.map((theme) => theme.id)).toEqual([
      "shifting-catacombs",
      "ember-vaults",
      "obsidian-sanctum",
    ]);
    expect(new Set(FLOOR_THEMES.map((theme) => theme.id)).size).toBe(3);
    FLOOR_THEMES.forEach((theme, index) => {
      expect(getFloorTheme((index + 1) as 1 | 2 | 3)).toBe(theme);
      expect(
        Object.values(theme)
          .filter((value) => typeof value === "number")
          .every(Number.isFinite),
      ).toBe(true);
    });
  });

  it("uses the exact depth difficulty profiles", () => {
    expect(FLOOR_DIFFICULTIES).toEqual([
      expect.objectContaining({
        id: "depth-1",
        enemyMaximumHealthBonus: 0,
        enemyMovementSpeedMultiplier: 1,
        enemyActionCooldownMultiplier: 1,
        ashWispProjectileSpeedMultiplier: 1,
        stoneWardenChargeSpeedMultiplier: 1,
      }),
      expect.objectContaining({
        id: "depth-2",
        enemyMaximumHealthBonus: 1,
        enemyMovementSpeedMultiplier: 1.08,
        enemyActionCooldownMultiplier: 0.92,
        ashWispProjectileSpeedMultiplier: 1.1,
        stoneWardenChargeSpeedMultiplier: 1.1,
      }),
      expect.objectContaining({
        id: "depth-3",
        enemyMaximumHealthBonus: 2,
        enemyMovementSpeedMultiplier: 1.16,
        enemyActionCooldownMultiplier: 0.84,
        ashWispProjectileSpeedMultiplier: 1.2,
        stoneWardenChargeSpeedMultiplier: 1.2,
      }),
    ]);
  });

  it("derives effective enemy values from immutable base configuration", () => {
    const baseSnapshot = JSON.stringify(ENEMY_ARCHETYPE_CONFIG);
    const wisp1 = deriveEffectiveEnemyStats("ash-wisp", getFloorDifficulty(1));
    const wisp2 = deriveEffectiveEnemyStats("ash-wisp", getFloorDifficulty(2));
    const wisp3 = deriveEffectiveEnemyStats("ash-wisp", getFloorDifficulty(3));
    expect(wisp1.maximumHealth).toBe(ENEMY_ARCHETYPE_CONFIG["ash-wisp"].maxHealth);
    expect(wisp2.maximumHealth).toBe(ENEMY_ARCHETYPE_CONFIG["ash-wisp"].maxHealth + 1);
    expect(wisp3.maximumHealth).toBe(ENEMY_ARCHETYPE_CONFIG["ash-wisp"].maxHealth + 2);
    expect(wisp2.wispProjectileSpeed).toBeCloseTo(ASH_WISP_CONFIG.projectileSpeed * 1.1);
    expect(wisp3.wispProjectileSpeed).toBeCloseTo(ASH_WISP_CONFIG.projectileSpeed * 1.2);
    expect(wisp3.wispShotCooldownMs).toBeCloseTo(ASH_WISP_CONFIG.shotCooldownMs * 0.84);
    expect(wisp3.wispTelegraphMs).toBe(350);
    const warden3 = deriveEffectiveEnemyStats("stone-warden", getFloorDifficulty(3));
    expect(warden3.wardenWindUpMs).toBe(550);
    expect(warden3.wardenChargeSpeed).toBeCloseTo(STONE_WARDEN_CONFIG.chargeSpeed * 1.2);
    expect(warden3.enemyDamage).toBe(1);
    expect(JSON.stringify(ENEMY_ARCHETYPE_CONFIG)).toBe(baseSnapshot);
    expect(deriveEffectiveEnemyStats("stone-warden", getFloorDifficulty(3))).toEqual(warden3);
    expect(() =>
      deriveEffectiveEnemyStats("bone-stalker", {
        ...getFloorDifficulty(1),
        enemyActionCooldownMultiplier: 0,
      }),
    ).toThrow(/positive/);
  });
});

describe("Phase 6 eight-upgrade offer contract", () => {
  it("preserves six effects and adds Windstep and Stalwart", () => {
    expect(UPGRADE_CATALOG).toHaveLength(8);
    expect(new Set(UPGRADE_IDS).size).toBe(8);
    const windstep = deriveEffectivePlayerStats(["windstep-sigil"]);
    expect(windstep.movementSpeedMultiplier).toBe(1.15);
    expect(windstep.dashSpeed).toBe(BASE_PLAYER_STATS.dashSpeed);
    const stalwart = deriveEffectivePlayerStats(["stalwart-rune"]);
    expect(stalwart.hitStunMs).toBe(90);
    expect(stalwart.playerKnockbackMs).toBe(80);
    expect(COMBAT_CONFIG.damagePerHit).toBe(1);
  });

  it("keeps three choices through the final legal Floor 3 offer", () => {
    const selected = UPGRADE_IDS.slice(0, 5);
    const offer = createUpgradeOffer("lt-76543210", 3, 1, selected);
    expect(offer.upgradeIds).toHaveLength(3);
    expect(new Set(offer.upgradeIds).size).toBe(3);
    offer.upgradeIds.forEach((id) => expect(selected).not.toContain(id));
    expect(createUpgradeOffer("lt-76543210", 3, 1, selected)).toEqual(offer);
    expect(createUpgradeOffer("lt-76543210", 2, 1, selected).fingerprint).not.toBe(
      offer.fingerprint,
    );
  });
});
