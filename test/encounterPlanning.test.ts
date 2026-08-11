import { describe, expect, it } from "vitest";

import { generateDungeon } from "../src/game/dungeon/generateDungeon";
import { findRoomAtTile, isWalkableTile } from "../src/game/dungeon/navigation";
import { createEncounterPlan } from "../src/game/encounters/createEncounterPlan";
import { ENCOUNTER_CONFIG, ENEMY_ARCHETYPE_CONFIG } from "../src/game/encounters/config";
import { validateEncounterPlan } from "../src/game/encounters/validateEncounterPlan";
import { createEscapeObjective } from "../src/game/objective/createEscapeObjective";

describe("deterministic encounter planning", () => {
  const layout = generateDungeon("combat-contract");
  const objective = createEscapeObjective(layout);
  const plan = createEncounterPlan(layout, objective);

  it("produces deeply equivalent plans for identical inputs", () => {
    expect(createEncounterPlan(layout, objective)).toEqual(createEncounterPlan(layout, objective));
  });

  it("produces the same encounter fingerprint for identical inputs", () => {
    expect(createEncounterPlan(layout, objective).fingerprint).toBe(plan.fingerprint);
  });

  it("normally produces different fingerprints for representative seeds", () => {
    const fingerprints = ["combat-ash", "combat-bone", "combat-stone"].map((seed) => {
      const candidateLayout = generateDungeon(seed);
      return createEncounterPlan(candidateLayout, createEscapeObjective(candidateLayout))
        .fingerprint;
    });
    expect(new Set(fingerprints).size).toBe(fingerprints.length);
  });

  it("creates exactly room count minus one enemies", () => {
    expect(plan.enemies).toHaveLength(layout.rooms.length - 1);
  });

  it("keeps the spawn room enemy-free", () => {
    expect(plan.enemies.some((enemy) => enemy.roomId === layout.spawnRoomId)).toBe(false);
  });

  it("places exactly one enemy in every non-spawn room", () => {
    const rooms = plan.enemies.map((enemy) => enemy.roomId).sort((a, b) => a - b);
    expect(rooms).toEqual(
      layout.rooms
        .filter((room) => room.id !== layout.spawnRoomId)
        .map((room) => room.id)
        .sort((a, b) => a - b),
    );
  });

  it("assigns unique enemy IDs", () => {
    expect(new Set(plan.enemies.map((enemy) => enemy.id)).size).toBe(plan.enemies.length);
  });

  it("keeps enemy ordering stable by room ID", () => {
    expect(plan.enemies.map((enemy) => enemy.roomId)).toEqual(
      [...plan.enemies].map((enemy) => enemy.roomId).sort((a, b) => a - b),
    );
  });

  it("references only existing room IDs", () => {
    const roomIds = new Set(layout.rooms.map((room) => room.id));
    expect(plan.enemies.every((enemy) => roomIds.has(enemy.roomId))).toBe(true);
  });

  it("uses finite enemy coordinates", () => {
    expect(
      plan.enemies.every((enemy) =>
        [enemy.position.x, enemy.position.y, enemy.position.tileX, enemy.position.tileY].every(
          Number.isFinite,
        ),
      ),
    ).toBe(true);
  });

  it("keeps each enemy position inside its declared room", () => {
    expect(
      plan.enemies.every(
        (enemy) =>
          findRoomAtTile(layout.rooms, enemy.position.tileX, enemy.position.tileY)?.id ===
          enemy.roomId,
      ),
    ).toBe(true);
  });

  it("places every enemy on walkable floor", () => {
    expect(
      plan.enemies.every((enemy) =>
        isWalkableTile(layout, enemy.position.tileX, enemy.position.tileY),
      ),
    ).toBe(true);
  });

  it("gives every enemy a full tile of wall clearance", () => {
    expect(
      plan.enemies.every((enemy) => {
        for (let y = enemy.position.tileY - 1; y <= enemy.position.tileY + 1; y += 1) {
          for (let x = enemy.position.tileX - 1; x <= enemy.position.tileX + 1; x += 1) {
            if (!isWalkableTile(layout, x, y)) return false;
          }
        }
        return true;
      }),
    ).toBe(true);
  });

  it("respects player-spawn separation", () => {
    expect(
      plan.enemies.every(
        (enemy) =>
          Math.hypot(enemy.position.x - layout.spawn.x, enemy.position.y - layout.spawn.y) >=
          ENCOUNTER_CONFIG.minimumObjectSeparation,
      ),
    ).toBe(true);
  });

  it("respects Runic Key separation", () => {
    expect(
      plan.enemies.every(
        (enemy) =>
          Math.hypot(
            enemy.position.x - objective.keyPosition.x,
            enemy.position.y - objective.keyPosition.y,
          ) >= ENCOUNTER_CONFIG.minimumObjectSeparation,
      ),
    ).toBe(true);
  });

  it("respects Ancient Gate separation", () => {
    expect(
      plan.enemies.every(
        (enemy) =>
          Math.hypot(
            enemy.position.x - objective.gatePosition.x,
            enemy.position.y - objective.gatePosition.y,
          ) >= ENCOUNTER_CONFIG.minimumObjectSeparation,
      ),
    ).toBe(true);
  });

  it("assigns an Ash Wisp to the Runic Key room", () => {
    expect(plan.enemies.find((enemy) => enemy.roomId === objective.keyRoomId)?.archetype).toBe(
      "ash-wisp",
    );
  });

  it("assigns a Stone Warden to the Ancient Gate room", () => {
    expect(plan.enemies.find((enemy) => enemy.roomId === objective.gateRoomId)?.archetype).toBe(
      "stone-warden",
    );
  });

  it("guarantees a Bone Stalker in a third distinct room", () => {
    expect(
      plan.enemies.some(
        (enemy) =>
          enemy.archetype === "bone-stalker" &&
          enemy.roomId !== objective.keyRoomId &&
          enemy.roomId !== objective.gateRoomId,
      ),
    ).toBe(true);
  });

  it("contains all three archetypes", () => {
    expect(new Set(plan.enemies.map((enemy) => enemy.archetype))).toEqual(
      new Set(["bone-stalker", "ash-wisp", "stone-warden"]),
    );
  });

  it("keeps remaining weighted assignments deterministic", () => {
    expect(createEncounterPlan(layout, objective).enemies.map((enemy) => enemy.archetype)).toEqual(
      plan.enemies.map((enemy) => enemy.archetype),
    );
  });

  it("matches maximum health to archetype configuration", () => {
    expect(
      plan.enemies.every(
        (enemy) => enemy.maxHealth === ENEMY_ARCHETYPE_CONFIG[enemy.archetype].maxHealth,
      ),
    ).toBe(true);
  });

  it("returns descriptive errors for invalid plans", () => {
    const validation = validateEncounterPlan(layout, objective, {
      ...plan,
      fingerprint: "broken",
      enemies: plan.enemies.slice(1),
    });
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.includes("Enemy count"))).toBe(true);
    expect(validation.errors.some((error) => error.includes("fingerprint"))).toBe(true);
  });

  it("validates 100 representative deterministic encounter plans", () => {
    for (let index = 0; index < 100; index += 1) {
      const candidateLayout = generateDungeon(
        `encounter-batch-${index.toString().padStart(3, "0")}`,
      );
      const candidateObjective = createEscapeObjective(candidateLayout);
      const candidatePlan = createEncounterPlan(candidateLayout, candidateObjective);
      expect(
        validateEncounterPlan(candidateLayout, candidateObjective, candidatePlan).errors,
        candidateLayout.seed,
      ).toEqual([]);
    }
  });

  it("uses a bounded one-pass enemy count across the representative batch", () => {
    for (let index = 0; index < 100; index += 1) {
      const candidateLayout = generateDungeon(`bounded-encounter-${index}`);
      const candidatePlan = createEncounterPlan(
        candidateLayout,
        createEscapeObjective(candidateLayout),
      );
      expect(candidatePlan.enemies.length).toBe(candidateLayout.rooms.length - 1);
    }
  });
});
