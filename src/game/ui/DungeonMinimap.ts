import type Phaser from "phaser";

import { GAME_WIDTH } from "../constants";
import type { RoomDiscoveryState } from "../dungeon/discovery";
import type { DungeonLayout, TilePoint } from "../dungeon/types";
import { deriveObjectiveMarkerState } from "../objective/minimapMarkers";
import type { EscapeObjectivePlan, EscapeObjectiveState } from "../objective/types";

export class DungeonMinimap {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly mapWidth = 178;
  private readonly mapHeight: number;
  private readonly offsetX = 12;
  private readonly offsetY = 27;

  public constructor(
    scene: Phaser.Scene,
    private readonly layout: DungeonLayout,
    private readonly objectivePlan: EscapeObjectivePlan,
  ) {
    this.mapHeight = (this.mapWidth * layout.mapHeight) / layout.mapWidth;
    const container = scene.add
      .container(GAME_WIDTH - this.mapWidth - 38, 20)
      .setScrollFactor(0)
      .setDepth(50);
    const plate = scene.add
      .rectangle(0, 0, this.mapWidth + 24, this.mapHeight + 39, 0x080b0d, 0.86)
      .setOrigin(0)
      .setStrokeStyle(1, 0x718082, 0.34);
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

  public update(discovery: RoomDiscoveryState, objectiveState: EscapeObjectiveState): void {
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
      this.graphics.lineStyle(3, 0x697678, 0.68);
      this.graphics.beginPath();
      this.graphics.moveTo(start.x, start.y);
      this.graphics.lineTo(bend.x, bend.y);
      this.graphics.lineTo(end.x, end.y);
      this.graphics.strokePath();
    });

    this.layout.rooms.forEach((room) => {
      if (!discovery.discoveredRoomIds.has(room.id)) return;
      const isCurrent = room.id === discovery.currentRoomId;
      this.graphics.fillStyle(isCurrent ? 0xc69a59 : 0x59676a, isCurrent ? 0.95 : 0.78);
      this.graphics.fillRect(
        this.offsetX + room.x * scaleX,
        this.offsetY + room.y * scaleY,
        Math.max(3, room.width * scaleX),
        Math.max(3, room.height * scaleY),
      );
      this.graphics.lineStyle(1, isCurrent ? 0xf2d399 : 0x899496, 0.75);
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
      this.graphics.lineStyle(1, 0xffecae, 0.95);
      this.graphics.strokeCircle(key.x, key.y, 5.2);
    }
    if (markerState.gate !== "hidden") {
      const gate = point({
        x: this.objectivePlan.gatePosition.tileX,
        y: this.objectivePlan.gatePosition.tileY,
      });
      const ready = markerState.gate === "ready";
      this.graphics.lineStyle(2, ready ? 0x8ce0c8 : 0xc35b55, 1);
      this.graphics.strokeCircle(gate.x, gate.y, 5.2);
      this.graphics.fillStyle(ready ? 0x8ce0c8 : 0x7b3330, ready ? 0.9 : 0.76);
      this.graphics.fillCircle(gate.x, gate.y, 2.2);
    }

    const currentRoom = this.layout.rooms.find((room) => room.id === discovery.currentRoomId);
    if (currentRoom) {
      const current = point(currentRoom.center);
      this.graphics.fillStyle(0xffe2a6, 1);
      this.graphics.fillCircle(current.x, current.y, 2.5);
    }
  }
}
