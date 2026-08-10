export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;
export const WALL_THICKNESS = 48;

export const PLAYER_SPEED = 230;
export const PLAYER_BODY_SIZE = 24;
export const PLAYER_SPAWN = Object.freeze({ x: 138, y: 360 });

export const SCENE_KEYS = Object.freeze({
  BOOT: "BootScene",
  MENU: "MenuScene",
  GAME: "GameScene",
});

export const TEXTURE_KEYS = Object.freeze({
  FLOOR: "dungeon-floor",
  STONE: "dungeon-stone",
  PLAYER: "dungeon-player",
});

export interface ObstacleDefinition {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const INTERIOR_OBSTACLES: readonly ObstacleDefinition[] = Object.freeze([
  { x: 315, y: 178, width: 170, height: 78 },
  { x: 600, y: 166, width: 82, height: 190 },
  { x: 930, y: 190, width: 205, height: 72 },
  { x: 315, y: 515, width: 88, height: 176 },
  { x: 620, y: 462, width: 220, height: 82 },
  { x: 965, y: 515, width: 92, height: 176 },
  { x: 1120, y: 350, width: 128, height: 72 },
]);
