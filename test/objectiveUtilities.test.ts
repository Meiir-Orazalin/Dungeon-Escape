import { describe, expect, it } from "vitest";

import { createRoomDiscovery } from "../src/game/dungeon/discovery";
import { generateDungeon } from "../src/game/dungeon/generateDungeon";
import { OBJECTIVE_CONFIG } from "../src/game/objective/config";
import { createEscapeObjective } from "../src/game/objective/createEscapeObjective";
import {
  isWithinInteractionRadius,
  selectInteractionTarget,
} from "../src/game/objective/interaction";
import { deriveObjectiveMarkerState } from "../src/game/objective/minimapMarkers";
import {
  createInitialObjectiveState,
  reduceObjectiveState,
} from "../src/game/objective/objectiveState";
import { formatElapsedTime } from "../src/game/objective/timer";

describe("objective interaction", () => {
  const player = { x: 0, y: 0 };

  it("accepts a target inside the interaction radius", () => {
    expect(isWithinInteractionRadius(player, { x: 20, y: 20 })).toBe(true);
  });

  it("rejects a target outside the interaction radius", () => {
    expect(isWithinInteractionRadius(player, { x: 80, y: 0 })).toBe(false);
  });

  it("uses an inclusive exact-radius boundary", () => {
    expect(isWithinInteractionRadius(player, { x: OBJECTIVE_CONFIG.interactionRadius, y: 0 })).toBe(
      true,
    );
  });

  it("selects the nearest target with a stable key-first tie-breaker", () => {
    expect(
      selectInteractionTarget(player, [
        { id: "gate", position: { x: 10, y: 0 }, available: true },
        { id: "key", position: { x: -10, y: 0 }, available: true },
      ]),
    ).toBe("key");
  });

  it("returns no target when both objectives are unavailable", () => {
    expect(
      selectInteractionTarget(player, [
        { id: "key", position: { x: 0, y: 0 }, available: false },
        { id: "gate", position: { x: 0, y: 0 }, available: false },
      ]),
    ).toBeNull();
  });
});

describe("elapsed timer formatting", () => {
  it("formats zero as 00:00", () => {
    expect(formatElapsedTime(0)).toBe("00:00");
  });

  it("formats seconds correctly", () => {
    expect(formatElapsedTime(9_999)).toBe("00:09");
  });

  it("formats minute rollover correctly", () => {
    expect(formatElapsedTime(60_000)).toBe("01:00");
  });

  it("supports times beyond 59 minutes", () => {
    expect(formatElapsedTime(3_661_000)).toBe("61:01");
  });

  it("defensively handles negative and non-finite input", () => {
    expect(formatElapsedTime(-1)).toBe("00:00");
    expect(formatElapsedTime(Number.NaN)).toBe("00:00");
    expect(formatElapsedTime(Number.POSITIVE_INFINITY)).toBe("00:00");
  });
});

describe("objective minimap markers", () => {
  const layout = generateDungeon("marker-contract");
  const plan = createEscapeObjective(layout);
  const seeking = createInitialObjectiveState();
  const collected = reduceObjectiveState(seeking, { type: "collect-key" }).state;

  it("hides an undiscovered Runic Key marker", () => {
    expect(
      deriveObjectiveMarkerState(createRoomDiscovery(layout.spawnRoomId), plan, seeking).key,
    ).toBe("hidden");
  });

  it("shows a discovered uncollected Runic Key marker", () => {
    const discovery = {
      discoveredRoomIds: new Set([plan.keyRoomId]),
      currentRoomId: plan.keyRoomId,
    };
    expect(deriveObjectiveMarkerState(discovery, plan, seeking).key).toBe("visible");
  });

  it("hides the Runic Key marker after collection", () => {
    const discovery = {
      discoveredRoomIds: new Set([plan.keyRoomId]),
      currentRoomId: plan.keyRoomId,
    };
    expect(deriveObjectiveMarkerState(discovery, plan, collected).key).toBe("hidden");
  });

  it("hides an undiscovered Ancient Gate marker", () => {
    expect(
      deriveObjectiveMarkerState(createRoomDiscovery(layout.spawnRoomId), plan, seeking).gate,
    ).toBe("hidden");
  });

  it("shows a discovered locked Ancient Gate as sealed", () => {
    const discovery = {
      discoveredRoomIds: new Set([plan.gateRoomId]),
      currentRoomId: plan.gateRoomId,
    };
    expect(deriveObjectiveMarkerState(discovery, plan, seeking).gate).toBe("sealed");
  });

  it("changes a discovered Ancient Gate marker to ready", () => {
    const discovery = {
      discoveredRoomIds: new Set([plan.gateRoomId]),
      currentRoomId: plan.gateRoomId,
    };
    expect(deriveObjectiveMarkerState(discovery, plan, collected).gate).toBe("ready");
  });

  it("does not mutate room-discovery state while deriving markers", () => {
    const discovery = createRoomDiscovery(layout.spawnRoomId);
    const before = [...discovery.discoveredRoomIds];
    deriveObjectiveMarkerState(discovery, plan, seeking);
    expect([...discovery.discoveredRoomIds]).toEqual(before);
    expect(discovery.currentRoomId).toBe(layout.spawnRoomId);
  });
});
