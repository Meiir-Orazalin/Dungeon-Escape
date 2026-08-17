import { describe, expect, it } from "vitest";

import { generateDungeon } from "../src/game/dungeon/generateDungeon";
import { findRoomAtTile, isWalkableTile } from "../src/game/dungeon/navigation";
import { createEncounterPlan } from "../src/game/encounters/createEncounterPlan";
import { createLootPlan } from "../src/game/loot/createLootPlan";
import { LOOT_CONFIG } from "../src/game/loot/config";
import { recomputeLootFingerprint } from "../src/game/loot/fingerprint";
import { pointHasLootClearance } from "../src/game/loot/placement";
import { resolveSafeDropPosition } from "../src/game/loot/safeDropPosition";
import { validateLootPlan } from "../src/game/loot/validateLootPlan";
import { createEscapeObjective } from "../src/game/objective/createEscapeObjective";
import { buildRoomAdjacency, calculateRoomDistances } from "../src/game/objective/graph";

function plans(seed: string) {
  const layout = generateDungeon(seed);
  const objective = createEscapeObjective(layout);
  const encounter = createEncounterPlan(layout, objective);
  const loot = createLootPlan(layout, objective, encounter);
  return { layout, objective, encounter, loot };
}

describe("deterministic loot planning", () => {
  const contract = plans("phase-five-loot-contract");

  it("reproduces deeply equivalent plans and fingerprints", () => {
    expect(createLootPlan(contract.layout, contract.objective, contract.encounter)).toEqual(
      contract.loot,
    );
    expect(contract.loot.fingerprint).toMatch(/^lt-[0-9a-f]{8}$/);
  });

  it("normally varies across representative seeds", () => {
    const fingerprints = ["loot-ash", "loot-bone", "loot-stone"].map(
      (seed) => plans(seed).loot.fingerprint,
    );
    expect(new Set(fingerprints).size).toBe(fingerprints.length);
  });

  it("plans exactly three unique chests in distinct eligible rooms", () => {
    expect(contract.loot.chests).toHaveLength(3);
    expect(new Set(contract.loot.chests.map((chest) => chest.id)).size).toBe(3);
    expect(new Set(contract.loot.chests.map((chest) => chest.roomId)).size).toBe(3);
    expect(
      contract.loot.chests.every(
        (chest) =>
          ![
            contract.layout.spawnRoomId,
            contract.objective.keyRoomId,
            contract.objective.gateRoomId,
          ].includes(chest.roomId),
      ),
    ).toBe(true);
  });

  it("selects the first chest room as the farthest eligible room with stable ties", () => {
    const adjacency = buildRoomAdjacency(contract.layout.rooms, contract.layout.connections);
    const distances = calculateRoomDistances(adjacency, contract.layout.spawnRoomId);
    const expected = contract.layout.rooms
      .filter(
        (room) =>
          ![
            contract.layout.spawnRoomId,
            contract.objective.keyRoomId,
            contract.objective.gateRoomId,
          ].includes(room.id),
      )
      .sort(
        (left, right) =>
          (distances.get(right.id) ?? -1) - (distances.get(left.id) ?? -1) || left.id - right.id,
      )[0];
    expect(contract.loot.chests[0]?.roomId).toBe(expected?.id);
  });

  it("uses deterministic maximin selection for later rooms", () => {
    const again = plans("phase-five-loot-contract");
    expect(again.loot.chests.map((chest) => chest.roomId)).toEqual(
      contract.loot.chests.map((chest) => chest.roomId),
    );
  });

  it("places chests on finite walkable room tiles with wall and enemy clearance", () => {
    contract.loot.chests.forEach((chest) => {
      expect(
        [chest.position.x, chest.position.y, chest.position.tileX, chest.position.tileY].every(
          Number.isFinite,
        ),
      ).toBe(true);
      expect(
        findRoomAtTile(contract.layout.rooms, chest.position.tileX, chest.position.tileY)?.id,
      ).toBe(chest.roomId);
      expect(isWalkableTile(contract.layout, chest.position.tileX, chest.position.tileY)).toBe(
        true,
      );
      expect(
        pointHasLootClearance(contract.layout, chest.position.tileX, chest.position.tileY),
      ).toBe(true);
      const enemy = contract.encounter.enemies.find(
        (candidate) => candidate.roomId === chest.roomId,
      )!;
      expect(
        Math.hypot(chest.position.x - enemy.position.x, chest.position.y - enemy.position.y),
      ).toBeGreaterThanOrEqual(LOOT_CONFIG.chestEnemySeparation);
    });
  });

  it("places the forge safely in the enemy-free spawn room", () => {
    const forge = contract.loot.forge;
    expect(forge.roomId).toBe(contract.layout.spawnRoomId);
    expect(
      [forge.position.x, forge.position.y, forge.position.tileX, forge.position.tileY].every(
        Number.isFinite,
      ),
    ).toBe(true);
    expect(
      findRoomAtTile(contract.layout.rooms, forge.position.tileX, forge.position.tileY)?.id,
    ).toBe(forge.roomId);
    expect(isWalkableTile(contract.layout, forge.position.tileX, forge.position.tileY)).toBe(true);
    expect(pointHasLootClearance(contract.layout, forge.position.tileX, forge.position.tileY)).toBe(
      true,
    );
    expect(
      Math.hypot(
        forge.position.x - contract.layout.spawn.x,
        forge.position.y - contract.layout.spawn.y,
      ),
    ).toBeGreaterThan(0);
  });

  it("assigns exactly one stable reward to every enemy", () => {
    expect(contract.loot.enemyRewards.map((reward) => reward.enemyId).sort()).toEqual(
      contract.encounter.enemies.map((enemy) => enemy.id).sort(),
    );
    expect(new Set(contract.loot.enemyRewards.map((reward) => reward.enemyId)).size).toBe(
      contract.encounter.enemies.length,
    );
  });

  it("uses archetype shard rules and deterministic flask rolls", () => {
    contract.loot.enemyRewards.forEach((reward) => {
      const enemy = contract.encounter.enemies.find(
        (candidate) => candidate.id === reward.enemyId,
      )!;
      expect(reward.shardAmount).toBe(enemy.archetype === "stone-warden" ? 2 : 1);
    });
    expect(plans("phase-five-loot-contract").loot.enemyRewards).toEqual(contract.loot.enemyRewards);
  });

  it("keeps chest rewards in range and guarantees the lowest chest flask", () => {
    expect(
      contract.loot.chests.every(
        (chest) =>
          chest.shardAmount >= LOOT_CONFIG.chestMinimumShards &&
          chest.shardAmount <= LOOT_CONFIG.chestMaximumShards,
      ),
    ).toBe(true);
    expect(
      [...contract.loot.chests].sort((a, b) => a.id.localeCompare(b.id))[0]?.containsFlask,
    ).toBe(true);
    expect(contract.loot.guaranteedFlaskCount).toBeGreaterThanOrEqual(1);
  });

  it("guarantees enough planned shards for both upgrades", () => {
    expect(contract.loot.totalPlannedShards).toBeGreaterThanOrEqual(14);
  });

  it("recomputes the ordered fingerprint and detects modification", () => {
    expect(
      recomputeLootFingerprint(
        contract.layout.fingerprint,
        contract.objective.fingerprint,
        contract.encounter.fingerprint,
        contract.loot,
      ),
    ).toBe(contract.loot.fingerprint);
    const modified = {
      ...contract.loot,
      chests: [
        { ...contract.loot.chests[0]!, shardAmount: contract.loot.chests[0]!.shardAmount + 1 },
        ...contract.loot.chests.slice(1),
      ],
    };
    expect(
      validateLootPlan(contract.layout, contract.objective, contract.encounter, modified).errors,
    ).toContain("Loot fingerprint does not match the ordered loot structure.");
  });

  it("returns descriptive errors for invalid plans", () => {
    const validation = validateLootPlan(contract.layout, contract.objective, contract.encounter, {
      ...contract.loot,
      fingerprint: "broken",
      chests: contract.loot.chests.slice(1),
      totalPlannedShards: 1,
      guaranteedFlaskCount: 0,
    });
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.includes("exactly 3 chests"))).toBe(true);
    expect(validation.errors.some((error) => error.includes("at least 14"))).toBe(true);
    expect(validation.errors.some((error) => error.includes("Vitality Flask"))).toBe(true);
  });

  it("validates 100 representative loot plans", () => {
    for (let index = 0; index < 100; index += 1) {
      const candidate = plans(`loot-batch-${index.toString().padStart(3, "0")}`);
      expect(
        validateLootPlan(candidate.layout, candidate.objective, candidate.encounter, candidate.loot)
          .errors,
        candidate.layout.seed,
      ).toEqual([]);
    }
  });
});

describe("safe runtime drop positioning", () => {
  const contract = plans("safe-runtime-drops");
  const enemy = contract.encounter.enemies[0]!;

  it("preserves a valid finite death position", () => {
    const resolved = resolveSafeDropPosition(contract.layout, enemy.roomId, enemy.position);
    expect(resolved.x).toBe(enemy.position.x);
    expect(resolved.y).toBe(enemy.position.y);
  });

  it("corrects wall-overlapping and out-of-room points deterministically", () => {
    const room = contract.layout.rooms.find((candidate) => candidate.id === enemy.roomId)!;
    const invalid = { x: room.x * contract.layout.tileSize, y: room.y * contract.layout.tileSize };
    const first = resolveSafeDropPosition(contract.layout, enemy.roomId, invalid);
    const second = resolveSafeDropPosition(contract.layout, enemy.roomId, invalid);
    expect(first).toEqual(second);
    expect(findRoomAtTile(contract.layout.rooms, first.tileX, first.tileY)?.id).toBe(enemy.roomId);
    expect(pointHasLootClearance(contract.layout, first.tileX, first.tileY)).toBe(true);
  });

  it("rejects non-finite input and missing rooms", () => {
    expect(() =>
      resolveSafeDropPosition(contract.layout, enemy.roomId, { x: Number.NaN, y: 0 }),
    ).toThrow(/finite/);
    expect(() => resolveSafeDropPosition(contract.layout, -1, { x: 0, y: 0 })).toThrow(
      /does not exist/,
    );
  });
});
