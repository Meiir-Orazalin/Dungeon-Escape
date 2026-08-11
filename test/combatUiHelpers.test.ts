import { describe, expect, it } from "vitest";

import { deriveHealthPips, formatDashStatus, formatEnemyCount } from "../src/game/combat/hudFormat";
import { createRoomDiscovery } from "../src/game/dungeon/discovery";
import { generateDungeon } from "../src/game/dungeon/generateDungeon";
import { createEncounterPlan } from "../src/game/encounters/createEncounterPlan";
import { deriveThreatRoomIds } from "../src/game/encounters/minimapThreats";
import { createEscapeObjective } from "../src/game/objective/createEscapeObjective";
import { deriveObjectiveMarkerState } from "../src/game/objective/minimapMarkers";
import { createInitialObjectiveState } from "../src/game/objective/objectiveState";

describe("minimap threats", () => {
  const layout = generateDungeon("threat-marker-contract");
  const objective = createEscapeObjective(layout);
  const encounters = createEncounterPlan(layout, objective);
  const keyEnemy = encounters.enemies.find((enemy) => enemy.roomId === objective.keyRoomId);

  it("hides threats in undiscovered enemy rooms", () => {
    const discovery = createRoomDiscovery(layout.spawnRoomId);
    expect(
      deriveThreatRoomIds(
        discovery,
        encounters,
        new Set(encounters.enemies.map((enemy) => enemy.id)),
      ),
    ).toEqual([]);
  });

  it("shows one threat in a discovered living enemy room", () => {
    const discovery = {
      discoveredRoomIds: new Set([objective.keyRoomId]),
      currentRoomId: objective.keyRoomId,
    };
    expect(deriveThreatRoomIds(discovery, encounters, new Set([keyEnemy?.id ?? ""]))).toEqual([
      objective.keyRoomId,
    ]);
  });

  it("removes a threat after that enemy is defeated", () => {
    const discovery = {
      discoveredRoomIds: new Set([objective.keyRoomId]),
      currentRoomId: objective.keyRoomId,
    };
    expect(deriveThreatRoomIds(discovery, encounters, new Set())).toEqual([]);
  });

  it("never creates a spawn-room threat", () => {
    const discovery = createRoomDiscovery(layout.spawnRoomId);
    expect(deriveThreatRoomIds(discovery, encounters, new Set(["not-a-planned-enemy"]))).toEqual(
      [],
    );
  });

  it("does not mutate discovery while deriving threats", () => {
    const discovery = createRoomDiscovery(layout.spawnRoomId);
    const before = [...discovery.discoveredRoomIds];
    deriveThreatRoomIds(
      discovery,
      encounters,
      new Set(encounters.enemies.map((enemy) => enemy.id)),
    );
    expect([...discovery.discoveredRoomIds]).toEqual(before);
  });

  it("allows key, gate, and threat markers to coexist deterministically", () => {
    const discovery = {
      discoveredRoomIds: new Set([objective.keyRoomId, objective.gateRoomId]),
      currentRoomId: objective.keyRoomId,
    };
    const threats = deriveThreatRoomIds(
      discovery,
      encounters,
      new Set(encounters.enemies.map((enemy) => enemy.id)),
    );
    const objectives = deriveObjectiveMarkerState(
      discovery,
      objective,
      createInitialObjectiveState(),
    );
    expect(threats).toContain(objective.keyRoomId);
    expect(threats).toContain(objective.gateRoomId);
    expect(objectives).toEqual({ key: "visible", gate: "sealed" });
  });

  it("orders threat room IDs stably", () => {
    const discovered = new Set(encounters.enemies.map((enemy) => enemy.roomId));
    const threats = deriveThreatRoomIds(
      { discoveredRoomIds: discovered, currentRoomId: objective.keyRoomId },
      encounters,
      new Set(encounters.enemies.map((enemy) => enemy.id)),
    );
    expect(threats).toEqual([...threats].sort((a, b) => a - b));
  });
});

describe("combat HUD helpers", () => {
  it("derives correct full and empty health pips", () => {
    expect(deriveHealthPips(3, 5)).toEqual({ full: 3, empty: 2 });
  });

  it("formats enemy counts", () => {
    expect(formatEnemyCount(4, 11)).toBe("4 / 11");
  });

  it("formats dash readiness", () => {
    expect(formatDashStatus({ status: "ready" })).toBe("READY");
  });

  it("formats bounded stable dash cooldown tenths", () => {
    expect(formatDashStatus({ status: "cooldown", cooldownRemainingMs: 849 })).toBe("0.9S");
    expect(formatDashStatus({ status: "cooldown", cooldownRemainingMs: -1 })).toBe("0.0S");
  });
});
