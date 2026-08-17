import { describe, expect, it } from "vitest";

import type { PlayerVitality } from "../src/game/combat/types";
import { healPlayer, increaseMaximumHealth } from "../src/game/combat/vitality";
import { UPGRADE_CATALOG, UPGRADE_IDS } from "../src/game/upgrades/catalog";
import { BASE_PLAYER_STATS, deriveEffectivePlayerStats } from "../src/game/upgrades/effectiveStats";
import { createUpgradeOffer, createUpgradeOfferFingerprint } from "../src/game/upgrades/offer";
import type { UpgradeId } from "../src/game/upgrades/types";

describe("Phase 5 upgrade catalog and offers", () => {
  it("contains exactly six stable unique upgrades", () => {
    expect(UPGRADE_CATALOG).toHaveLength(6);
    expect(new Set(UPGRADE_IDS).size).toBe(6);
  });

  it("reproduces deterministic three-choice offers", () => {
    const first = createUpgradeOffer("lt-1234abcd", 0, []);
    expect(createUpgradeOffer("lt-1234abcd", 0, [])).toEqual(first);
    expect(first.upgradeIds).toHaveLength(3);
    expect(new Set(first.upgradeIds).size).toBe(3);
    expect(first.fingerprint).toMatch(/^uo-[0-9a-f]{8}$/);
  });

  it("excludes selections and derives the second offer from history", () => {
    const first = createUpgradeOffer("lt-1234abcd", 0, []);
    const selected = first.upgradeIds[0]!;
    const second = createUpgradeOffer("lt-1234abcd", 1, [selected]);
    expect(second.upgradeIds).not.toContain(selected);
    expect(createUpgradeOffer("lt-1234abcd", 1, [selected])).toEqual(second);
    expect(second.fingerprint).not.toBe(first.fingerprint);
  });

  it("normally varies across loot fingerprints", () => {
    const offers = ["lt-11111111", "lt-22222222", "lt-33333333"].map((fingerprint) =>
      createUpgradeOffer(fingerprint, 0, []).upgradeIds.join(","),
    );
    expect(new Set(offers).size).toBeGreaterThan(1);
  });

  it("rejects invalid indices and inconsistent history without mutating the catalog", () => {
    const before = [...UPGRADE_IDS];
    expect(() => createUpgradeOffer("lt-1234abcd", 2, [])).toThrow(/zero or one/);
    expect(() => createUpgradeOffer("lt-1234abcd", 1, [])).toThrow(/history/);
    expect(UPGRADE_IDS).toEqual(before);
  });

  it("fingerprints explicit offer ordering and selection history", () => {
    const ids = ["tempered-edge", "long-reach", "vital-rune"] as const;
    expect(createUpgradeOfferFingerprint("lt-1234abcd", 0, [], ids)).toBe(
      createUpgradeOfferFingerprint("lt-1234abcd", 0, [], ids),
    );
    expect(createUpgradeOfferFingerprint("lt-1234abcd", 0, [], ids)).not.toBe(
      createUpgradeOfferFingerprint("lt-1234abcd", 0, [], [...ids].reverse()),
    );
  });
});

describe("effective player stats", () => {
  it("preserves exact Phase 4 base stats without upgrades", () => {
    expect(deriveEffectivePlayerStats([])).toEqual(BASE_PLAYER_STATS);
  });

  const expectations: readonly [UpgradeId, string, number][] = [
    ["tempered-edge", "meleeDamage", 2],
    ["long-reach", "meleeRange", 76],
    ["quickened-steel", "attackRecoveryMs", 75],
    ["fleet-sigil", "dashCooldownMs", 650],
    ["vital-rune", "maximumHealth", 6],
    ["aegis-rune", "postHitInvulnerabilityMs", 1_150],
  ];

  expectations.forEach(([id, property, expected]) => {
    it(`${id} applies its documented effective stat`, () => {
      expect(deriveEffectivePlayerStats([id])[property as keyof typeof BASE_PLAYER_STATS]).toBe(
        expected,
      );
    });
  });

  it("Quickened Steel keeps wind-up/active timing and a coherent cooldown", () => {
    const stats = deriveEffectivePlayerStats(["quickened-steel"]);
    expect(stats.attackWindUpMs).toBe(45);
    expect(stats.attackActiveMs).toBe(80);
    expect(stats.attackCooldownMs).toBe(260);
    expect(stats.attackCooldownMs).toBeGreaterThanOrEqual(
      stats.attackWindUpMs + stats.attackActiveMs + stats.attackRecoveryMs,
    );
  });

  it("is independent of selected-upgrade insertion order", () => {
    expect(deriveEffectivePlayerStats(["long-reach", "tempered-edge"])).toEqual(
      deriveEffectivePlayerStats(["tempered-edge", "long-reach"]),
    );
  });

  it("rejects duplicate, unknown, and more than two IDs", () => {
    expect(() => deriveEffectivePlayerStats(["long-reach", "long-reach"])).toThrow(/unique/);
    expect(() => deriveEffectivePlayerStats(["unknown"])).toThrow(/unknown/);
    expect(() => deriveEffectivePlayerStats(["long-reach", "tempered-edge", "vital-rune"])).toThrow(
      /at most two/,
    );
  });

  it("keeps all effective numbers finite and timing coherent", () => {
    const stats = deriveEffectivePlayerStats(["quickened-steel", "fleet-sigil"]);
    expect(Object.values(stats).every(Number.isFinite)).toBe(true);
    expect(stats.dashCooldownMs).toBeGreaterThanOrEqual(stats.dashDurationMs);
  });
});

describe("defensive healing transitions", () => {
  const injured: PlayerVitality = {
    status: "alive",
    health: 2,
    maximumHealth: 5,
    invulnerabilityRemainingMs: 400,
    hitStunRemainingMs: 0,
  };

  it("heals, clamps, and preserves invulnerability", () => {
    const healed = healPlayer(injured, 2);
    expect(healed.state).toEqual({ ...injured, health: 4 });
    expect(healed.restoredHealth).toBe(2);
    expect(healed.consumed).toBe(true);
    expect(healPlayer({ ...injured, health: 4 }, 2).state.health).toBe(5);
  });

  it("does not consume at full health or revive defeat", () => {
    const full: PlayerVitality = { ...injured, health: 5 };
    expect(healPlayer(full, 2)).toEqual({ state: full, restoredHealth: 0, consumed: false });
    const defeated: PlayerVitality = { status: "defeated", health: 0, maximumHealth: 5 };
    expect(healPlayer(defeated, 2)).toEqual({
      state: defeated,
      restoredHealth: 0,
      consumed: false,
    });
  });

  it("rejects non-positive and non-finite healing", () => {
    expect(() => healPlayer(injured, -1)).toThrow();
    expect(() => healPlayer(injured, Number.NaN)).toThrow();
  });

  it("Vital Rune raises maximum health and restores exactly one", () => {
    const transition = increaseMaximumHealth(injured, 6, 1);
    expect(transition.state.health).toBe(3);
    expect(transition.state.maximumHealth).toBe(6);
    expect(transition.restoredHealth).toBe(1);
  });
});
