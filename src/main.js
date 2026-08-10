import {
  createDungeon,
  createInitialState,
  directionFromKey,
  movePlayer,
  TILE,
} from "./game.js";

const canvas = document.querySelector("#dungeon");
const context = canvas.getContext("2d");
const canvasWrap = document.querySelector(".canvas-wrap");
const moveCount = document.querySelector("#move-count");
const runState = document.querySelector("#run-state");
const statusMessage = document.querySelector("#game-status");
const victory = document.querySelector("#victory");
const victorySummary = document.querySelector("#victory-summary");
const restartButton = document.querySelector("#restart");
const playAgainButton = document.querySelector("#play-again");
const directionButtons = [...document.querySelectorAll("[data-direction]")];

const dungeon = createDungeon();
let state = createInitialState(dungeon);
let pulseStart = performance.now();
let collisionTimer = null;
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

const palette = Object.freeze({
  void: "#080b11",
  mortar: "#111823",
  wall: "#27313c",
  wallLight: "#35414c",
  wallDark: "#171e27",
  floor: "#151c25",
  floorLight: "#1d2731",
  seam: "#29333d",
  portal: "#57e0ff",
  portalCore: "#d6f8ff",
  player: "#f5c66c",
  cloak: "#bb653e",
});

function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, safeRadius);
}

function drawFloor(x, y, size, column, row) {
  context.fillStyle = palette.floor;
  context.fillRect(x, y, size, size);
  context.strokeStyle = palette.seam;
  context.lineWidth = Math.max(1, size * 0.025);
  context.strokeRect(x + size * 0.04, y + size * 0.04, size * 0.92, size * 0.92);

  if ((column * 7 + row * 11) % 5 === 0) {
    context.strokeStyle = palette.floorLight;
    context.beginPath();
    context.moveTo(x + size * 0.2, y + size * 0.68);
    context.lineTo(x + size * 0.45, y + size * 0.54);
    context.lineTo(x + size * 0.72, y + size * 0.62);
    context.stroke();
  }
}

function drawWall(x, y, size, column, row) {
  context.fillStyle = palette.mortar;
  context.fillRect(x, y, size, size);

  const gap = Math.max(1, size * 0.045);
  const inset = size * 0.07;
  const brickHeight = (size - inset * 2 - gap) / 2;
  const offset = (column + row) % 2 === 0 ? size * 0.1 : 0;

  context.fillStyle = palette.wall;
  roundedRect(context, x + inset, y + inset, size - inset * 2, brickHeight, size * 0.06);
  context.fill();
  context.fillStyle = palette.wallDark;
  roundedRect(
    context,
    x + inset - offset,
    y + inset + brickHeight + gap,
    size - inset * 2 + offset,
    brickHeight,
    size * 0.05,
  );
  context.fill();

  context.fillStyle = palette.wallLight;
  context.fillRect(x + inset * 1.4, y + inset * 1.35, size * 0.48, Math.max(1, size * 0.04));
}

function drawPortal(x, y, size, time) {
  const pulse = (Math.sin((time - pulseStart) / 330) + 1) / 2;
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const glow = context.createRadialGradient(centerX, centerY, size * 0.05, centerX, centerY, size * 0.72);
  glow.addColorStop(0, `rgba(214, 248, 255, ${0.85 + pulse * 0.15})`);
  glow.addColorStop(0.35, `rgba(87, 224, 255, ${0.6 + pulse * 0.2})`);
  glow.addColorStop(1, "rgba(87, 224, 255, 0)");
  context.fillStyle = glow;
  context.fillRect(x - size * 0.25, y - size * 0.25, size * 1.5, size * 1.5);

  context.save();
  context.translate(centerX, centerY);
  context.rotate((time - pulseStart) / 2200);
  context.strokeStyle = palette.portal;
  context.lineWidth = Math.max(2, size * 0.075);
  context.beginPath();
  context.arc(0, 0, size * (0.25 + pulse * 0.035), 0, Math.PI * 2);
  context.stroke();
  context.rotate(-(time - pulseStart) / 900);
  context.strokeStyle = `rgba(214, 248, 255, ${0.75 + pulse * 0.25})`;
  context.beginPath();
  context.moveTo(0, -size * 0.35);
  context.lineTo(size * 0.22, 0);
  context.lineTo(0, size * 0.35);
  context.lineTo(-size * 0.22, 0);
  context.closePath();
  context.stroke();
  context.restore();
}

function drawPlayer(x, y, size) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const facingOffset = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  }[state.facing];

  const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 1.25);
  glow.addColorStop(0, "rgba(245, 198, 108, 0.22)");
  glow.addColorStop(1, "rgba(245, 198, 108, 0)");
  context.fillStyle = glow;
  context.fillRect(x - size, y - size, size * 3, size * 3);

  context.save();
  context.translate(centerX, centerY);
  context.fillStyle = "rgba(0, 0, 0, 0.35)";
  context.beginPath();
  context.ellipse(0, size * 0.28, size * 0.25, size * 0.1, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = palette.cloak;
  context.beginPath();
  context.moveTo(0, -size * 0.14);
  context.lineTo(size * 0.28, size * 0.29);
  context.lineTo(-size * 0.28, size * 0.29);
  context.closePath();
  context.fill();

  context.fillStyle = palette.player;
  context.beginPath();
  context.arc(0, -size * 0.15, size * 0.18, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#2a1d19";
  context.beginPath();
  context.arc(facingOffset.x * size * 0.09, -size * 0.15 + facingOffset.y * size * 0.08, size * 0.04, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function resizeCanvas() {
  const bounds = canvasWrap.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const cssWidth = Math.max(1, Math.floor(bounds.width));
  const cssHeight = (cssWidth * dungeon.height) / dungeon.width;

  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.floor(cssWidth * ratio);
  canvas.height = Math.floor(cssHeight * ratio);
  render(motionPreference.matches ? pulseStart : performance.now());
}

function render(time) {
  const tileWidth = canvas.width / dungeon.width;
  const tileHeight = canvas.height / dungeon.height;
  context.fillStyle = palette.void;
  context.fillRect(0, 0, canvas.width, canvas.height);

  dungeon.grid.forEach((row, y) => {
    row.forEach((tile, x) => {
      const drawX = x * tileWidth;
      const drawY = y * tileHeight;

      if (tile === TILE.WALL) {
        drawWall(drawX, drawY, tileWidth, x, y);
      } else {
        drawFloor(drawX, drawY, tileWidth, x, y);
      }

      if (tile === TILE.EXIT) {
        drawPortal(drawX, drawY, tileWidth, time);
      }
    });
  });

  drawPlayer(state.player.x * tileWidth, state.player.y * tileHeight, tileWidth);
}

function updateInterface() {
  moveCount.textContent = String(state.moves).padStart(2, "0");
  const won = state.status === "won";
  runState.textContent = won ? "Escaped" : state.moves > 0 ? "Exploring" : "Ready";
  runState.className = won ? "status-won" : "status-ready";
  victory.hidden = !won;
  directionButtons.forEach((button) => {
    button.disabled = won;
  });

  canvas.setAttribute(
    "aria-label",
    won
      ? `Dungeon map. You reached the portal in ${state.moves} steps.`
      : `Dungeon map. Explorer at column ${state.player.x + 1}, row ${state.player.y + 1}. Portal at column ${dungeon.exit.x + 1}, row ${dungeon.exit.y + 1}.`,
  );

  if (won) {
    const stepLabel = state.moves === 1 ? "step" : "steps";
    victorySummary.textContent = `The old dungeon yielded after ${state.moves} ${stepLabel}.`;
    statusMessage.textContent = `You escaped the dungeon in ${state.moves} ${stepLabel}.`;
  }
}

function clearCollisionFeedback() {
  window.clearTimeout(collisionTimer);
  canvasWrap.classList.remove("is-blocked");
}

function attemptMove(direction) {
  const result = movePlayer(dungeon, state, direction);

  if (!result.moved && result.reason === "wall") {
    clearCollisionFeedback();
    canvasWrap.classList.add("is-blocked");
    statusMessage.textContent = "Solid stone. Choose another passage.";
    collisionTimer = window.setTimeout(clearCollisionFeedback, 240);
    return;
  }

  if (!result.moved) return;

  state = result.state;
  if (result.reason !== "escaped") {
    statusMessage.textContent = "The portal's blue light flickers beyond the walls.";
  }
  updateInterface();
  render(motionPreference.matches ? pulseStart : performance.now());

  if (result.reason === "escaped") {
    playAgainButton.focus();
  }
}

function restartGame({ moveFocus = false } = {}) {
  state = createInitialState(dungeon);
  pulseStart = performance.now();
  clearCollisionFeedback();
  statusMessage.textContent = "Find the glowing portal. The stone walls will block your path.";
  updateInterface();
  render(pulseStart);
  if (moveFocus) canvas.focus();
}

document.addEventListener("keydown", (event) => {
  const direction = directionFromKey(event.key);
  if (!direction) return;
  event.preventDefault();
  attemptMove(direction);
});

directionButtons.forEach((button) => {
  button.addEventListener("click", () => attemptMove(button.dataset.direction));
});

restartButton.addEventListener("click", () => restartGame({ moveFocus: true }));
playAgainButton.addEventListener("click", () => restartGame({ moveFocus: true }));
new ResizeObserver(resizeCanvas).observe(canvasWrap);

function animate(time) {
  render(time);
  if (!motionPreference.matches) {
    window.requestAnimationFrame(animate);
  }
}

motionPreference.addEventListener("change", () => {
  pulseStart = performance.now();
  render(pulseStart);
  if (!motionPreference.matches) window.requestAnimationFrame(animate);
});

updateInterface();
resizeCanvas();
if (!motionPreference.matches) window.requestAnimationFrame(animate);
