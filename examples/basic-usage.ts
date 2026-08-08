/**
 * Example: Basic usage of the tilemap engine
 * 
 * This example demonstrates how to:
 * - Create a world with custom configuration
 * - Register tile types
 * - Create and register a custom generator
 * - Set up rendering with Canvas 2D
 * - Handle player movement and chunk loading
 */

import {
  World,
  BaseGenerator,
  CanvasChunkRenderer,
  ChunkViewManager,
  SeededRandom,
} from '../src/index';
import type { Chunk } from '../src/index';

// ============================================================================
// 1. Define tile types
// ============================================================================

const TILES = {
  EMPTY: 0,
  GRASS: 1,
  DIRT: 2,
  WATER: 3,
  STONE: 4,
  WALL: 5,
} as const;

// ============================================================================
// 2. Create a custom terrain generator
// ============================================================================

class TerrainGenerator extends BaseGenerator {
  readonly id = 'terrain';

  protected buildChunk(chunk: Chunk, seed: number): void {
    const rng = new SeededRandom(seed);
    
    // Simple noise-based terrain generation
    for (let y = 0; y < chunk.size; y++) {
      for (let x = 0; x < chunk.size; x++) {
        // Use chunk position to create world-coordinate based noise
        const worldX = chunk.x * chunk.size + x;
        const worldY = chunk.y * chunk.size + y;
        
        // Simple height calculation using sine waves
        const height = Math.sin(worldX * 0.1) * Math.cos(worldY * 0.1) * 0.5 + 0.5;
        
        let tileId: number;
        if (height < 0.3) {
          tileId = TILES.WATER;
        } else if (height < 0.5) {
          tileId = TILES.GRASS;
        } else if (height < 0.7) {
          tileId = rng.chance(0.3) ? TILES.DIRT : TILES.GRASS;
        } else {
          tileId = rng.chance(0.2) ? TILES.STONE : TILES.GRASS;
        }
        
        chunk.setTile(x, y, tileId);
      }
    }
  }
}

// ============================================================================
// 3. Initialize the world
// ============================================================================

const world = new World({
  config: {
    chunkSize: 16,
    tileSize: 32,
    loadRadius: 2,
    unloadBuffer: 1,
  },
  baseSeed: 12345,
});

// Register tile definitions
world.registerTile({ id: TILES.EMPTY, name: 'empty', passable: true });
world.registerTile({ id: TILES.GRASS, name: 'grass', passable: true });
world.registerTile({ id: TILES.DIRT, name: 'dirt', passable: true });
world.registerTile({ id: TILES.WATER, name: 'water', passable: false });
world.registerTile({ id: TILES.STONE, name: 'stone', passable: true });
world.registerTile({ id: TILES.WALL, name: 'wall', passable: false, opaque: true });

// Register the terrain generator
world.registerGenerator(new TerrainGenerator());

// ============================================================================
// 4. Set up rendering
// ============================================================================

const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d')!;

const renderer = new CanvasChunkRenderer({
  tiles: world.tiles,
  worldConfig: world.config,
  visuals: new Map([
    [TILES.GRASS, { color: '#4a7c59' }],
    [TILES.DIRT, { color: '#8b6f47' }],
    [TILES.WATER, { color: '#3498db' }],
    [TILES.STONE, { color: '#7f8c8d' }],
    [TILES.WALL, { color: '#34495e' }],
  ]),
  useCache: true,
});

const viewManager = new ChunkViewManager({
  worldConfig: world.config,
  renderer,
});

// ============================================================================
// 5. Player and game loop
// ============================================================================

const player = {
  x: 0,
  y: 0,
  speed: 200, // pixels per second
};

const camera = {
  x: 0,
  y: 0,
  scale: 1,
};

// Input handling
const keys = new Set<string>();
window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

// Zoom with mouse wheel
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  camera.scale = Math.max(0.25, Math.min(2, camera.scale * zoomFactor));
});

let lastTime = performance.now();

function gameLoop(currentTime: number) {
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // Update player position
  if (keys.has('w') || keys.has('arrowup')) player.y -= player.speed * deltaTime;
  if (keys.has('s') || keys.has('arrowdown')) player.y += player.speed * deltaTime;
  if (keys.has('a') || keys.has('arrowleft')) player.x -= player.speed * deltaTime;
  if (keys.has('d') || keys.has('arrowright')) player.x += player.speed * deltaTime;

  // Check if player can move (collision detection)
  if (!world.isPassable(player.x, player.y)) {
    // Simple rollback - in a real game you'd do proper collision response
    player.x -= player.speed * deltaTime * (keys.has('a') ? -1 : keys.has('d') ? 1 : 0);
    player.y -= player.speed * deltaTime * (keys.has('w') ? -1 : keys.has('s') ? 1 : 0);
  }

  // Update camera to follow player
  camera.x = player.x;
  camera.y = player.y;

  // Update chunks around player
  world.update(player.x, player.y);

  // Render
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  viewManager.render(
    world.getLoadedChunks(),
    ctx,
    camera.x,
    camera.y,
    canvas.width,
    canvas.height,
    camera.scale
  );

  // Draw player
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(camera.scale, camera.scale);
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);

console.log('Example loaded! Use WASD to move, mouse wheel to zoom.');
