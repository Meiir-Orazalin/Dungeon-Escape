export const TILE = Object.freeze({
  WALL: "#",
  FLOOR: ".",
  START: "S",
  EXIT: "E",
});

export const DIRECTIONS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1 }),
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
  right: Object.freeze({ x: 1, y: 0 }),
});

export const DEFAULT_LEVEL = Object.freeze([
  "###################",
  "#S....#.......#...#",
  "#.###.#.#####.#.#.#",
  "#...#.#.....#...#.#",
  "###.#.#####.#####.#",
  "#...#.....#.......#",
  "#.#######.#######.#",
  "#.......#.....#...#",
  "#.#####.#####.#.###",
  "#.#...#.......#...#",
  "#.#.#.###########.#",
  "#...#............E#",
  "###################",
]);

const VALID_TILES = new Set(Object.values(TILE));

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

function exitIsReachable(grid, start, exit) {
  const queue = [start];
  const visited = new Set([`${start.x},${start.y}`]);

  for (let index = 0; index < queue.length; index += 1) {
    const position = queue[index];

    if (samePosition(position, exit)) {
      return true;
    }

    for (const delta of Object.values(DIRECTIONS)) {
      const next = { x: position.x + delta.x, y: position.y + delta.y };
      const key = `${next.x},${next.y}`;
      const tile = grid[next.y]?.[next.x];

      if (tile !== undefined && tile !== TILE.WALL && !visited.has(key)) {
        visited.add(key);
        queue.push(next);
      }
    }
  }

  return false;
}

export function createDungeon(rows = DEFAULT_LEVEL) {
  if (!Array.isArray(rows) || rows.length < 3 || typeof rows[0] !== "string") {
    throw new TypeError("A dungeon requires at least three rows of tiles.");
  }

  const width = rows[0].length;
  if (width < 3 || rows.some((row) => typeof row !== "string" || row.length !== width)) {
    throw new Error("Every dungeon row must have the same width of at least three tiles.");
  }

  const grid = rows.map((row) => [...row]);
  let start = null;
  let exit = null;

  grid.forEach((row, y) => {
    row.forEach((tile, x) => {
      if (!VALID_TILES.has(tile)) {
        throw new Error(`Unknown dungeon tile "${tile}" at ${x},${y}.`);
      }

      if (tile === TILE.START) {
        if (start) throw new Error("A dungeon can only contain one starting tile.");
        start = { x, y };
      }

      if (tile === TILE.EXIT) {
        if (exit) throw new Error("A dungeon can only contain one exit tile.");
        exit = { x, y };
      }
    });
  });

  if (!start || !exit) {
    throw new Error("A dungeon requires exactly one start and one exit.");
  }

  if (!exitIsReachable(grid, start, exit)) {
    throw new Error("The dungeon exit must be reachable from the starting tile.");
  }

  return Object.freeze({
    width,
    height: grid.length,
    grid: Object.freeze(grid.map((row) => Object.freeze(row))),
    start: Object.freeze(start),
    exit: Object.freeze(exit),
  });
}

export function createInitialState(dungeon) {
  return Object.freeze({
    player: Object.freeze({ ...dungeon.start }),
    moves: 0,
    facing: "right",
    status: "playing",
  });
}

export function tileAt(dungeon, position) {
  return dungeon.grid[position.y]?.[position.x];
}

export function movePlayer(dungeon, state, direction) {
  const delta = DIRECTIONS[direction];

  if (!delta) {
    throw new RangeError(`Unknown movement direction: ${direction}`);
  }

  if (state.status !== "playing") {
    return Object.freeze({ state, moved: false, reason: "finished" });
  }

  const destination = {
    x: state.player.x + delta.x,
    y: state.player.y + delta.y,
  };

  if (tileAt(dungeon, destination) === undefined || tileAt(dungeon, destination) === TILE.WALL) {
    return Object.freeze({ state, moved: false, reason: "wall" });
  }

  const won = samePosition(destination, dungeon.exit);
  const nextState = Object.freeze({
    player: Object.freeze(destination),
    moves: state.moves + 1,
    facing: direction,
    status: won ? "won" : "playing",
  });

  return Object.freeze({ state: nextState, moved: true, reason: won ? "escaped" : "moved" });
}

export function directionFromKey(key) {
  const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    W: "up",
    s: "down",
    S: "down",
    a: "left",
    A: "left",
    d: "right",
    D: "right",
  };

  return keyMap[key] ?? null;
}
