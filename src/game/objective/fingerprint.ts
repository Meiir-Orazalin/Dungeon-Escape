import { hashSeed } from "../dungeon/seed";
import type { WorldPoint } from "../dungeon/types";
import { OBJECTIVE_CONFIG } from "./config";

interface ObjectiveFingerprintInput {
  readonly layoutFingerprint: string;
  readonly keyRoomId: number;
  readonly keyPosition: WorldPoint;
  readonly gateRoomId: number;
  readonly gatePosition: WorldPoint;
}

function pointContract(point: WorldPoint): string {
  return `${point.tileX},${point.tileY},${point.x},${point.y}`;
}

export function createObjectiveFingerprint(input: ObjectiveFingerprintInput): string {
  const contract = [
    `v${OBJECTIVE_CONFIG.contractVersion}`,
    input.layoutFingerprint,
    `key:${input.keyRoomId}:${pointContract(input.keyPosition)}`,
    `gate:${input.gateRoomId}:${pointContract(input.gatePosition)}`,
  ].join("|");

  return `eo-${hashSeed(contract).toString(16).padStart(8, "0")}`;
}
