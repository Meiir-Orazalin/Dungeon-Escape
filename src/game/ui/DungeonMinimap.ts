import type Phaser from "phaser";

import { GAME_WIDTH } from "../constants";
import type { RoomDiscoveryState } from "../dungeon/discovery";
import type { DungeonLayout, TilePoint } from "../dungeon/types";
import { deriveThreatRoomIds } from "../encounters/minimapThreats";
import type { EncounterPlan } from "../encounters/types";
import { deriveLootMinimapMarkers } from "../loot/minimapLoot";
import type { RunRewardState } from "../loot/rewardState";
import type { LootPlan } from "../loot/types";
import { deriveObjectiveMarkerState } from "../objective/minimapMarkers";
import type { EscapeObjectivePlan, EscapeObjectiveState } from "../objective/types";
import { getFloorTheme } from "../run/themes";
import type { FloorTheme } from "../run/types";

export class DungeonMinimap {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly mapWidth = 178;
  private readonly mapHeight: number;
  private readonly offsetX = 12;
  private readonly offsetY = 27;
  private highContrast = false;

  public constructor(
    scene: Phaser.Scene,
    private readonly layout: DungeonLayout,
    private readonly objectivePlan: EscapeObjectivePlan,
    private readonly encounterPlan: EncounterPlan,
    private readonly lootPlan: LootPlan,
    private readonly theme: FloorTheme = getFloorTheme(1),
    highContrast = false,
  ) {
    this.highContrast = highContrast;
    this.mapHeight = (this.mapWidth * layout.mapHeight) / layout.mapWidth;
    const container = scene.add
      .container(GAME_WIDTH - this.mapWidth - 38, 20)
      .setScrollFactor(0)
      .setDepth(50);
    const plate = scene.add
      .rectangle(0, 0, this.mapWidth + 24, this.mapHeight + 39, 0x080b0d, 0.86)
      .setOrigin(0)
      .setStrokeStyle(highContrast ? 2 : 1, 0x718082, highContrast ? 0.8 : 0.34);
    const label = scene.add.text(12, 9, "DISCOVERED PATHS", {
      color: "#899597",
      fontFamily: "Arial, sans-serif",
      fontSize: "9px",
      fontStyle: "bold",
      letterSpacing: 1.2,
    });
    this.graphics = scene.add.graphics();
    container.add([plate, label, this.graphics]);
  }

  public setHighContrast(highContrast: boolean): void {
    this.highContrast = highContrast;
  }

  public update(
    discovery: RoomDiscoveryState,
    objectiveState: EscapeObjectiveState,
    aliveEnemyIds: ReadonlySet<string>,
    rewardState: RunRewardState,
  ): void {
    const thin = this.highContrast ? 2 : 1;
    const scaleX = this.mapWidth / this.layout.mapWidth;
    const scaleY = this.mapHeight / this.layout.mapHeight;
    const point = (tile: TilePoint): TilePoint => ({
      x: this.offsetX + (tile.x + 0.5) * scaleX,
      y: this.offsetY + (tile.y + 0.5) * scaleY,
    });

    this.graphics.clear();
    this.graphics.fillStyle(0x0b1012, 0.9);
    this.graphics.fillRect(this.offsetX, this.offsetY, this.mapWidth, this.mapHeight);

    this.layout.connections.forEach((connection) => {
      if (
        !discovery.discoveredRoomIds.has(connection.fromRoomId) ||
        !discovery.discoveredRoomIds.has(connection.toRoomId)
      ) {
        return;
      }

      const [start, bend, end] = connection.waypoints.map(point) as [
        TilePoint,
        TilePoint,
        TilePoint,
      ];
      this.graphics.lineStyle(this.highContrast ? 4 : 3, 0x697678, 0.68);
      this.graphics.beginPath();
      this.graphics.moveTo(start.x, start.y);
      this.graphics.lineTo(bend.x, bend.y);
      this.graphics.lineTo(end.x, end.y);
      this.graphics.strokePath();
    });

    this.layout.rooms.forEach((room) => {
      if (!discovery.discoveredRoomIds.has(room.id)) return;
      const isCurrent = room.id === discovery.currentRoomId;
      this.graphics.fillStyle(
        isCurrent ? this.theme.accentColor : 0x59676a,
        isCurrent ? 0.95 : 0.78,
      );
      this.graphics.fillRect(
        this.offsetX + room.x * scaleX,
        this.offsetY + room.y * scaleY,
        Math.max(3, room.width * scaleX),
        Math.max(3, room.height * scaleY),
      );
      this.graphics.lineStyle(thin, isCurrent ? 0xf2d399 : 0x899496, 0.9);
      this.graphics.strokeRect(
        this.offsetX + room.x * scaleX,
        this.offsetY + room.y * scaleY,
        Math.max(3, room.width * scaleX),
        Math.max(3, room.height * scaleY),
      );
    });

    const markerState = deriveObjectiveMarkerState(discovery, this.objectivePlan, objectiveState);
    if (markerState.key === "visible") {
      const key = point({
        x: this.objectivePlan.keyPosition.tileX,
        y: this.objectivePlan.keyPosition.tileY,
      });
      this.graphics.fillStyle(0xf4c96e, 1);
      this.graphics.fillCircle(key.x, key.y, 3.4);
      this.graphics.lineStyle(thin, 0xffecae, 0.95);
      this.graphics.strokeCircle(key.x, key.y, 5.2);
    }
    if (markerState.gate !== "hidden") {
      const gate = point({
        x: this.objectivePlan.gatePosition.tileX,
        y: this.objectivePlan.gatePosition.tileY,
      });
      const ready = markerState.gate === "ready";
      this.graphics.lineStyle(this.highContrast ? 3 : 2, ready ? 0x8ce0c8 : 0xc35b55, 1);
      this.graphics.strokeCircle(gate.x, gate.y, 5.2);
      this.graphics.fillStyle(ready ? 0x8ce0c8 : 0x7b3330, ready ? 0.9 : 0.76);
      this.graphics.fillCircle(gate.x, gate.y, 2.2);
    }

    deriveThreatRoomIds(discovery, this.encounterPlan, aliveEnemyIds).forEach((roomId) => {
      const room = this.layout.rooms.find((candidate) => candidate.id === roomId);
      if (!room) return;
      const threat = point(room.center);
      this.graphics.fillStyle(0xd65e55, 0.98);
      this.graphics.fillTriangle(
        threat.x - 3.5,
        threat.y + 4.5,
        threat.x + 3.5,
        threat.y + 4.5,
        threat.x,
        threat.y - 3.5,
      );
      this.graphics.lineStyle(thin, 0xffb097, 0.9);
      this.graphics.strokeTriangle(
        threat.x - 3.5,
        threat.y + 4.5,
        threat.x + 3.5,
        threat.y + 4.5,
        threat.x,
        threat.y - 3.5,
      );
    });

    const forgeState =
      rewardState.forge.status === "exhausted"
        ? "exhausted"
        : rewardState.forge.status === "ready" || rewardState.forge.status === "choosing"
          ? "ready"
          : "dormant";
    const lootMarkers = deriveLootMinimapMarkers(
      discovery,
      this.lootPlan,
      rewardState.openedChestIds,
      forgeState,
    );
    lootMarkers.chestRoomIds.forEach((roomId) => {
      const chest = this.lootPlan.chests.find((candidate) => candidate.roomId === roomId);
      if (!chest) return;
      const marker = point({ x: chest.position.tileX, y: chest.position.tileY });
      this.graphics.fillStyle(0xd6a45b, 0.98);
      this.graphics.fillRect(marker.x - 3.5, marker.y - 2.5, 7, 5);
      this.graphics.lineStyle(thin, 0xffd786, 0.9);
      this.graphics.strokeRect(marker.x - 3.5, marker.y - 2.5, 7, 5);
    });
    const forge = point({
      x: this.lootPlan.forge.position.tileX,
      y: this.lootPlan.forge.position.tileY,
    });
    const forgeColor =
      lootMarkers.forge === "ready"
        ? 0x78e1cc
        : lootMarkers.forge === "exhausted"
          ? 0x657173
          : 0x9c7544;
    this.graphics.lineStyle(this.highContrast ? 3 : 1.5, forgeColor, 1);
    this.graphics.strokeCircle(forge.x, forge.y, 4.2);
    this.graphics.fillStyle(forgeColor, lootMarkers.forge === "exhausted" ? 0.45 : 0.9);
    this.graphics.fillCircle(forge.x, forge.y, 1.8);

    const currentRoom = this.layout.rooms.find((room) => room.id === discovery.currentRoomId);
    if (currentRoom) {
      const current = point(currentRoom.center);
      this.graphics.fillStyle(0xffe2a6, 1);
      this.graphics.fillCircle(current.x, current.y, 2.5);
    }
  }
}
