import { SeededRandom } from "../dungeon/random";
import { hashSeed } from "../dungeon/seed";
import type { DungeonLayout } from "../dungeon/types";
import type { EscapeObjectivePlan } from "../objective/types";
import { ENCOUNTER_CONFIG, ENEMY_ARCHETYPE_CONFIG } from "./config";
import { createEncounterFingerprint } from "./fingerprint";
import { selectEnemySpawn } from "./spawnSelection";
import type { EncounterPlan, EnemyArchetype, EnemySpawnPlan } from "./types";
import { validateEncounterPlan } from "./validateEncounterPlan";

function weightedArchetype(random: SeededRandom): EnemyArchetype {
  const value = random.next();
  if (value < ENCOUNTER_CONFIG.boneStalkerWeight) return "bone-stalker";
  if (value < ENCOUNTER_CONFIG.boneStalkerWeight + ENCOUNTER_CONFIG.ashWispWeight) {
    return "ash-wisp";
  }
  return "stone-warden";
}

function enemyId(roomId: number, archetype: EnemyArchetype): string {
  return `enemy-${roomId.toString().padStart(2, "0")}-${archetype}`;
}

export class EncounterPlanningError extends Error {
  public constructor(layoutFingerprint: string, errors: readonly string[]) {
    super(`Unable to create encounters for layout ${layoutFingerprint}: ${errors.join("; ")}`);
    this.name = "EncounterPlanningError";
  }
}

export function createEncounterPlan(
  layout: DungeonLayout,
  objective: EscapeObjectivePlan,
): EncounterPlan {
  const rooms = [...layout.rooms]
    .filter((room) => room.id !== layout.spawnRoomId)
    .sort((left, right) => left.id - right.id);
  const guaranteedStalkerRoomId = rooms.find(
    (room) => room.id !== objective.keyRoomId && room.id !== objective.gateRoomId,
  )?.id;
  if (guaranteedStalkerRoomId === undefined) {
    throw new EncounterPlanningError(layout.fingerprint, [
      "No distinct room is available for the guaranteed Bone Stalker.",
    ]);
  }

  const random = new SeededRandom(
    hashSeed(`${layout.fingerprint}:${objective.fingerprint}:encounter-archetypes`),
  );
  const enemies: EnemySpawnPlan[] = rooms.map((room) => {
    const archetype: EnemyArchetype =
      room.id === objective.keyRoomId
        ? "ash-wisp"
        : room.id === objective.gateRoomId
          ? "stone-warden"
          : room.id === guaranteedStalkerRoomId
            ? "bone-stalker"
            : weightedArchetype(random);
    const position = selectEnemySpawn(layout, room, [
      layout.spawn,
      objective.keyPosition,
      objective.gatePosition,
    ]);
    return Object.freeze({
      id: enemyId(room.id, archetype),
      archetype,
      roomId: room.id,
      position,
      maxHealth: ENEMY_ARCHETYPE_CONFIG[archetype].maxHealth,
    });
  });
  const frozenEnemies = Object.freeze(enemies);
  const plan: EncounterPlan = Object.freeze({
    fingerprint: createEncounterFingerprint({
      layoutFingerprint: layout.fingerprint,
      objectiveFingerprint: objective.fingerprint,
      enemies: frozenEnemies,
    }),
    enemies: frozenEnemies,
  });
  const validation = validateEncounterPlan(layout, objective, plan);
  if (!validation.valid) throw new EncounterPlanningError(layout.fingerprint, validation.errors);
  return plan;
}
