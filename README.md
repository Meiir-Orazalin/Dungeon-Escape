# Dungeon Escape

Dungeon Escape is a compact, responsive browser game about navigating a torchlit labyrinth. Phase 1 establishes the project foundation and a complete movement loop: explore the dungeon, collide with walls, find the portal, and restart for another run.

## Play locally

Requirements: Node.js 20 or newer.

```bash
npm start
```

Open <http://127.0.0.1:4173>. Move with **WASD**, the arrow keys, or the on-screen directional pad.

## Verify the project

```bash
npm run check
```

The check command validates the JavaScript entry points and runs the game-model test suite. The game has no external runtime dependencies or build step.

## Phase 1 scope

- Deterministic, validated dungeon model with a guaranteed reachable exit
- Keyboard and touch-friendly directional movement
- Wall collision, move tracking, win state, and restart flow
- Responsive canvas rendering with high-DPI support
- Accessible status updates, focus handling, and reduced-motion support
- Dependency-free local development server and automated model tests
