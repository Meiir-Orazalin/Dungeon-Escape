import assert from "node:assert/strict";
import test from "node:test";

import {
  createDungeon,
  createInitialState,
  DEFAULT_LEVEL,
  directionFromKey,
  movePlayer,
  tileAt,
  TILE,
} from "../src/game.js";

const TEST_LEVEL = [
  "#####",
  "#S.E#",
  "#...#",
  "#####",
];

test("creates a valid dungeon with one reachable start and exit", () => {
  const dungeon = createDungeon(TEST_LEVEL);

  assert.equal(dungeon.width, 5);
  assert.equal(dungeon.height, 4);
  assert.deepEqual(dungeon.start, { x: 1, y: 1 });
  assert.deepEqual(dungeon.exit, { x: 3, y: 1 });
  assert.equal(tileAt(dungeon, dungeon.exit), TILE.EXIT);
});

test("rejects malformed or impossible dungeon layouts", () => {
  assert.throws(() => createDungeon(["#####", "#S..#", "#####"]), /start and one exit/);
  assert.throws(() => createDungeon(["#####", "#S#E#", "#####"]), /must be reachable/);
  assert.throws(() => createDungeon(["#####", "#SXE#", "#####"]), /Unknown dungeon tile/);
  assert.throws(() => createDungeon(["#####", "#S.E", "#####"]), /same width/);
});

test("moves onto an open floor and records the step and facing", () => {
  const dungeon = createDungeon(TEST_LEVEL);
  const initial = createInitialState(dungeon);
  const result = movePlayer(dungeon, initial, "down");

  assert.equal(result.moved, true);
  assert.equal(result.reason, "moved");
  assert.deepEqual(result.state.player, { x: 1, y: 2 });
  assert.equal(result.state.moves, 1);
  assert.equal(result.state.facing, "down");
  assert.equal(result.state.status, "playing");
});

test("walls block movement without incrementing the step count", () => {
  const dungeon = createDungeon(TEST_LEVEL);
  const initial = createInitialState(dungeon);
  const result = movePlayer(dungeon, initial, "up");

  assert.equal(result.moved, false);
  assert.equal(result.reason, "wall");
  assert.strictEqual(result.state, initial);
  assert.equal(result.state.moves, 0);
});

test("reaching the exit wins the run and locks further movement", () => {
  const dungeon = createDungeon(TEST_LEVEL);
  const initial = createInitialState(dungeon);
  const first = movePlayer(dungeon, initial, "right");
  const winning = movePlayer(dungeon, first.state, "right");
  const afterWin = movePlayer(dungeon, winning.state, "left");

  assert.equal(winning.moved, true);
  assert.equal(winning.reason, "escaped");
  assert.equal(winning.state.status, "won");
  assert.equal(winning.state.moves, 2);
  assert.deepEqual(winning.state.player, dungeon.exit);
  assert.equal(afterWin.moved, false);
  assert.equal(afterWin.reason, "finished");
  assert.strictEqual(afterWin.state, winning.state);
});

test("maps supported keyboard inputs and ignores unrelated keys", () => {
  assert.equal(directionFromKey("w"), "up");
  assert.equal(directionFromKey("D"), "right");
  assert.equal(directionFromKey("ArrowDown"), "down");
  assert.equal(directionFromKey(" "), null);
});

test("rejects unknown movement directions", () => {
  const dungeon = createDungeon(TEST_LEVEL);
  assert.throws(() => movePlayer(dungeon, createInitialState(dungeon), "northwest"), /Unknown movement/);
});

test("the shipped dungeon supports a complete playable route", () => {
  const dungeon = createDungeon(DEFAULT_LEVEL);
  const solution = [
    "down", "down", "right", "right", "down", "down", "left", "left",
    "down", "down", "down", "down", "down", "down", "right", "right",
    "up", "up", "right", "right", "down", "down", "right", "right",
    "right", "right", "right", "right", "right", "right", "right", "right",
    "right", "right",
  ];

  const finalState = solution.reduce(
    (currentState, direction) => movePlayer(dungeon, currentState, direction).state,
    createInitialState(dungeon),
  );

  assert.equal(finalState.status, "won");
  assert.equal(finalState.moves, solution.length);
  assert.deepEqual(finalState.player, dungeon.exit);
});
