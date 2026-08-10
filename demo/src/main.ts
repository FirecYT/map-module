/**
 * Map Module — Interactive Demo
 *
 * A complete demo showcasing:
 * - Procedural world generation with multiple generators
 * - Chunk loading/unloading with LOD
 * - Player movement with collision detection
 * - Camera following with smooth interpolation
 * - Zoom with mouse wheel
 * - Tile editing (place/remove with mouse)
 * - Minimap rendering
 * - Debug HUD with real-time info
 * - World regeneration with different seeds
 */

import {
  World,
  CanvasChunkRenderer,
  ChunkViewManager,
  CheckerboardGenerator,
  LODManager,
  DEFAULT_LOD_CONFIG,
} from '@firec/map-module';
import type { TileVisualProvider, TileVisualContext, TileVisual } from '@firec/map-module';

import {
  BiomeGenerator,
  IslandGenerator,
  DungeonGenerator,
  FlatGenerator,
  WorldWithVillagesGenerator,
  BIOME_TILES,
  DUNGEON_TILES,
} from './generators';

// ============================================================================
// Tile Definitions
// ============================================================================

// Combined tile registry for all generators
// We use a unified set so the renderer can handle any generator's output.
const TILES = {
  // Biome tiles
  EMPTY: 0,
  DEEP_WATER: 1,
  WATER: 2,
  SAND: 3,
  GRASS: 4,
  FOREST: 5,
  STONE: 6,
  SNOW: 7,
  TREE: 8,
  ROCK: 9,
  FLOWER: 10,
  // Dungeon tiles (reuse IDs where possible)
  WALL: 11,
  FLOOR: 12,
  DOOR: 13,
  TORCH: 14,
  PILLAR: 15,
  // Checkerboard (uses 1, 2 — already defined)
};

/**
 * Tile definitions: id, name, passable, opaque, color
 */
interface TileDef {
  id: number;
  name: string;
  passable: boolean;
  opaque: boolean;
  color: string;
}

const TILE_DEFS: TileDef[] = [
  { id: TILES.EMPTY, name: 'empty', passable: true, opaque: false, color: '#1a1a1a' },
  { id: TILES.DEEP_WATER, name: 'deep_water', passable: false, opaque: false, color: '#1a3a5c' },
  { id: TILES.WATER, name: 'water', passable: false, opaque: false, color: '#2d6ca8' },
  { id: TILES.SAND, name: 'sand', passable: true, opaque: false, color: '#d4b872' },
  { id: TILES.GRASS, name: 'grass', passable: true, opaque: false, color: '#4a7c59' },
  { id: TILES.FOREST, name: 'forest', passable: true, opaque: false, color: '#2d5a3f' },
  { id: TILES.STONE, name: 'stone', passable: true, opaque: false, color: '#6b6b6b' },
  { id: TILES.SNOW, name: 'snow', passable: true, opaque: false, color: '#d8dce6' },
  { id: TILES.TREE, name: 'tree', passable: false, opaque: true, color: '#1e4d2b' },
  { id: TILES.ROCK, name: 'rock', passable: false, opaque: false, color: '#4a4a4a' },
  { id: TILES.FLOWER, name: 'flower', passable: true, opaque: false, color: '#5a8c69' },
  { id: TILES.WALL, name: 'wall', passable: false, opaque: true, color: '#3a3a3a' },
  { id: TILES.FLOOR, name: 'floor', passable: true, opaque: false, color: '#8a7a6a' },
  { id: TILES.DOOR, name: 'door', passable: true, opaque: false, color: '#8b5e3c' },
  { id: TILES.TORCH, name: 'torch', passable: true, opaque: false, color: '#f5c842' },
  { id: TILES.PILLAR, name: 'pillar', passable: false, opaque: false, color: '#5a5a5a' },
];

// ============================================================================
// Visual Providers — dynamic tile rendering with context
// ============================================================================

function createVisuals(): Map<number, TileVisualProvider> {
  const visuals = new Map<number, TileVisualProvider>();

  // Simple color-based visuals for most tiles
  for (const def of TILE_DEFS) {
    if (def.id === TILES.EMPTY) continue;
    visuals.set(def.id, { color: def.color });
  }

  // Dynamic visual for trees: slight color variation
  visuals.set(TILES.TREE, (ctx: TileVisualContext): TileVisual => {
    const variation = ((ctx.globalTileX * 73 + ctx.globalTileY * 137) % 20) - 10;
    const r = Math.max(0, Math.min(255, 30 + variation));
    const g = Math.max(0, Math.min(255, 77 + variation));
    const b = Math.max(0, Math.min(255, 43 + variation));
    return { color: `rgb(${r},${g},${b})` };
  });

  // Dynamic visual for flowers: random colors
  visuals.set(TILES.FLOWER, (ctx: TileVisualContext): TileVisual => {
    const hash = ((ctx.globalTileX * 7919 + ctx.globalTileY * 104729) % 4);
    const colors = ['#e74c3c', '#f39c12', '#9b59b6', '#e91e63'];
    return { color: colors[hash] };
  });

  // Dynamic visual for torches: pulsing glow effect
  visuals.set(TILES.TORCH, (ctx: TileVisualContext): TileVisual => {
    const pulse = Math.sin(Date.now() * 0.005 + ctx.globalTileX * 0.5) * 0.2 + 0.8;
    const brightness = Math.floor(200 * pulse + 55);
    return { color: `rgb(${brightness},${Math.floor(brightness * 0.7)},${Math.floor(brightness * 0.2)})` };
  });

  // Grass variation
  visuals.set(TILES.GRASS, (ctx: TileVisualContext): TileVisual => {
    const v = ((ctx.globalTileX * 31 + ctx.globalTileY * 47) % 15) - 7;
    const r = Math.max(0, Math.min(255, 74 + v));
    const g = Math.max(0, Math.min(255, 124 + v));
    const b = Math.max(0, Math.min(255, 89 + v));
    return { color: `rgb(${r},${g},${b})` };
  });

  // Water animation
  visuals.set(TILES.WATER, (ctx: TileVisualContext): TileVisual => {
    const wave = Math.sin(Date.now() * 0.002 + ctx.globalTileX * 0.3 + ctx.globalTileY * 0.2) * 10;
    const r = Math.max(0, Math.min(255, 45 + wave));
    const g = Math.max(0, Math.min(255, 108 + wave));
    const b = Math.max(0, Math.min(255, 168 + wave));
    return { color: `rgb(${r},${g},${b})` };
  });

  return visuals;
}

// ============================================================================
// Game State
// ============================================================================

interface GameState {
  // Player
  player: { x: number; y: number; speed: number };
  camera: { x: number; y: number; scale: number; smooth: boolean };

  // Input
  keys: Set<string>;
  mouse: { x: number; y: number; worldX: number; worldY: number; leftDown: boolean; rightDown: boolean };

  // Settings
  collisions: boolean;
  selectedTile: number;
  currentGenerator: string;
  seed: number;
  autoLoadRadius: boolean;

  // Stats
  fps: number;
  frameCount: number;
  frameTime: number;
  totalFrames: number;
  loadedChunks: number;

  // Config
  chunkSize: number;
  tileSize: number;
  loadRadius: number;
}

const state: GameState = {
  player: { x: 0, y: 0, speed: 200 },
  camera: { x: 0, y: 0, scale: 1, smooth: true },
  keys: new Set(),
  mouse: { x: 0, y: 0, worldX: 0, worldY: 0, leftDown: false, rightDown: false },
  collisions: true,
  selectedTile: TILES.GRASS,
  currentGenerator: 'biomes',
  seed: 42,
  autoLoadRadius: false,
  fps: 0,
  frameCount: 0,
  frameTime: 0,
  totalFrames: 0,
  loadedChunks: 0,
  chunkSize: 16,
  tileSize: 32,
  loadRadius: 3,
};

// ============================================================================
// DOM References
// ============================================================================

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
const minimapCtx = minimapCanvas.getContext('2d')!;

// HUD elements
const hudFps = document.getElementById('hud-fps')!;
const hudPlayer = document.getElementById('hud-player')!;
const hudChunk = document.getElementById('hud-chunk')!;
const hudTile = document.getElementById('hud-tile')!;
const hudPassable = document.getElementById('hud-passable')!;
const hudLoaded = document.getElementById('hud-loaded')!;
const hudScale = document.getElementById('hud-scale')!;
const hudLod = document.getElementById('hud-lod')!;
const hudLodCanvas = document.getElementById('hud-lod-canvas')!;
const hudLodTile = document.getElementById('hud-lod-tile')!;

// Stats
const statLoaded = document.getElementById('stat-loaded')!;
const statTiles = document.getElementById('stat-tiles')!;
const statFrames = document.getElementById('stat-frames')!;
const statFrametime = document.getElementById('stat-frametime')!;

// Controls
const inputSeed = document.getElementById('input-seed') as HTMLInputElement;
const selectGenerator = document.getElementById('select-generator') as HTMLSelectElement;
const btnRegenerate = document.getElementById('btn-regenerate') as HTMLButtonElement;
const btnRandomSeed = document.getElementById('btn-random-seed') as HTMLButtonElement;

const rangeChunkSize = document.getElementById('range-chunk-size') as HTMLInputElement;
const rangeTileSize = document.getElementById('range-tile-size') as HTMLInputElement;
const rangeLoadRadius = document.getElementById('range-load-radius') as HTMLInputElement;
const rangeSpeed = document.getElementById('range-speed') as HTMLInputElement;
const chkCollisions = document.getElementById('chk-collisions') as HTMLInputElement;
const chkSmoothCamera = document.getElementById('chk-smooth-camera') as HTMLInputElement;
const chkAutoLoadRadius = document.getElementById('chk-auto-load-radius') as HTMLInputElement;

const valChunkSize = document.getElementById('val-chunk-size')!;
const valTileSize = document.getElementById('val-tile-size')!;
const valLoadRadius = document.getElementById('val-load-radius')!;
const valSpeed = document.getElementById('val-speed')!;

const eventLog = document.getElementById('event-log')!;
const tilePicker = document.getElementById('tile-picker')!;

// ============================================================================
// World Setup
// ============================================================================

let world: World;
let renderer: CanvasChunkRenderer;
let viewManager: ChunkViewManager;

function createWorld(): void {
  // Dispose old world
  if (world) {
    world.dispose();
  }

  state.seed = parseInt(inputSeed.value, 10) || Math.floor(Math.random() * 999999);
  inputSeed.value = state.seed.toString();

  world = new World({
    config: {
      chunkSize: state.chunkSize,
      tileSize: state.tileSize,
      loadRadius: state.loadRadius,
      unloadBuffer: 2,
    },
    baseSeed: state.seed,
  });

  // Register all tiles (skip ID 0, it's already registered as EMPTY_TILE by TileRegistry)
  for (const def of TILE_DEFS) {
    if (def.id === 0) continue; // EMPTY_TILE is auto-registered
    world.registerTile({
      id: def.id,
      name: def.name,
      passable: def.passable,
      opaque: def.opaque,
    });
  }

  // Register generators
  world.registerGenerator(new BiomeGenerator());
  world.registerGenerator(new IslandGenerator());
  world.registerGenerator(new DungeonGenerator());
  world.registerGenerator(new FlatGenerator());
  world.registerGenerator(new WorldWithVillagesGenerator());
  world.registerGenerator(new CheckerboardGenerator(4, 5)); // Uses grass/forest for visual clarity

  // Set active generator based on selection
  const genId = state.currentGenerator;
  // Unregister all except the selected one
  for (const id of ['biomes', 'islands', 'dungeon', 'flat', 'checkerboard', 'world-with-villages']) {
    if (id !== genId) {
      world.unregisterGenerator(id);
    }
  }

  // Create renderer
  renderer = new CanvasChunkRenderer({
    tiles: world.tiles,
    worldConfig: world.config,
    visuals: createVisuals(),
    useCache: true,
  });

  // Create view manager with default LOD config (log2-based thresholds)
  // LOD 0: scale >= 1.0, LOD 1: scale >= 0.5, LOD 2: scale >= 0.25, etc.
  // Max 6 levels (beyond LOD 5, tile size is already 1px — minimum).
  viewManager = new ChunkViewManager({
    worldConfig: world.config,
    renderer,
    lodManager: new LODManager(DEFAULT_LOD_CONFIG),
  });

  // Reset player position
  state.player.x = 0;
  state.player.y = 0;
  state.camera.x = 0;
  state.camera.y = 0;

  // Event listeners
  world.events.on('chunkLoaded', (e) => {
    addLogEntry(`Chunk loaded: (${e.chunkX}, ${e.chunkY})`);
  });

  world.events.on('chunkUnloaded', (e) => {
    addLogEntry(`Chunk unloaded: (${e.chunkX}, ${e.chunkY})`);
  });

  // Initial update
  world.update(state.player.x, state.player.y);

  addLogEntry(`World created with seed ${state.seed} [${state.currentGenerator}]`);
}

// ============================================================================
// Input Handling
// ============================================================================

function setupInput(): void {
  // Keyboard
  window.addEventListener('keydown', (e) => {
    state.keys.add(e.key.toLowerCase());

    // Tile selection with number keys
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= 7) {
      const tileIds = [TILES.GRASS, TILES.WATER, TILES.SAND, TILES.STONE, TILES.TREE, TILES.ROCK, TILES.FLOWER];
      if (num <= tileIds.length) {
        state.selectedTile = tileIds[num - 1];
        updateTilePicker();
      }
    }

    // Regenerate with R
    if (e.key.toLowerCase() === 'r') {
      inputSeed.value = Math.floor(Math.random() * 999999).toString();
      createWorld();
    }
  });

  window.addEventListener('keyup', (e) => {
    state.keys.delete(e.key.toLowerCase());
  });

  // Mouse move
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = e.clientX - rect.left;
    state.mouse.y = e.clientY - rect.top;

    // Convert to world coordinates
    const vpW = canvas.width;
    const vpH = canvas.height;
    state.mouse.worldX = state.camera.x + (state.mouse.x - vpW / 2) / state.camera.scale;
    state.mouse.worldY = state.camera.y + (state.mouse.y - vpH / 2) / state.camera.scale;
  });

  // Mouse buttons
  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (e.button === 0) state.mouse.leftDown = true;
    if (e.button === 2) state.mouse.rightDown = true;
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) state.mouse.leftDown = false;
    if (e.button === 2) state.mouse.rightDown = false;
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    state.camera.scale = Math.max(0.01, Math.min(10, state.camera.scale * factor));
  }, { passive: false });

  // Resize
  function resizeCanvas(): void {
    const container = canvas.parentElement!;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
}

// ============================================================================
// Sidebar Controls
// ============================================================================

function setupControls(): void {
  // Ranges
  rangeChunkSize.addEventListener('input', () => {
    state.chunkSize = parseInt(rangeChunkSize.value, 10);
    valChunkSize.textContent = state.chunkSize.toString();
  });

  rangeTileSize.addEventListener('input', () => {
    state.tileSize = parseInt(rangeTileSize.value, 10);
    valTileSize.textContent = state.tileSize.toString();
  });

  rangeLoadRadius.addEventListener('input', () => {
    state.loadRadius = parseInt(rangeLoadRadius.value, 10);
    valLoadRadius.textContent = state.loadRadius.toString();
  });

  rangeSpeed.addEventListener('input', () => {
    state.player.speed = parseInt(rangeSpeed.value, 10);
    valSpeed.textContent = state.player.speed.toString();
  });

  // Checkboxes
  chkCollisions.addEventListener('change', () => {
    state.collisions = chkCollisions.checked;
  });

  chkSmoothCamera.addEventListener('change', () => {
    state.camera.smooth = chkSmoothCamera.checked;
  });

  chkAutoLoadRadius.addEventListener('change', () => {
    state.autoLoadRadius = chkAutoLoadRadius.checked;
    rangeLoadRadius.disabled = state.autoLoadRadius;
    if (!state.autoLoadRadius) {
      // Restore manual load radius
      world.config.loadRadius = parseInt(rangeLoadRadius.value, 10);
    }
  });

  // Generator select
  selectGenerator.addEventListener('change', () => {
    state.currentGenerator = selectGenerator.value;
  });

  // Buttons
  btnRegenerate.addEventListener('click', () => createWorld());
  btnRandomSeed.addEventListener('click', () => {
    inputSeed.value = Math.floor(Math.random() * 999999).toString();
    createWorld();
  });

  // Tile picker
  buildTilePicker();
}

function buildTilePicker(): void {
  tilePicker.innerHTML = '';

  const editableTiles = [
    TILES.GRASS, TILES.WATER, TILES.DEEP_WATER, TILES.SAND,
    TILES.FOREST, TILES.STONE, TILES.SNOW, TILES.TREE,
    TILES.ROCK, TILES.FLOWER, TILES.WALL, TILES.FLOOR,
    TILES.TORCH, TILES.PILLAR, TILES.DOOR, TILES.EMPTY,
  ];

  for (const tileId of editableTiles) {
    const def = TILE_DEFS.find(d => d.id === tileId);
    if (!def) continue;

    const btn = document.createElement('button');
    btn.style.backgroundColor = def.color;
    btn.title = def.name;
    btn.dataset.tileId = tileId.toString();

    if (tileId === state.selectedTile) {
      btn.classList.add('active');
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tile-name';
    nameSpan.textContent = def.name.slice(0, 6);
    btn.appendChild(nameSpan);

    btn.addEventListener('click', () => {
      state.selectedTile = tileId;
      updateTilePicker();
    });

    tilePicker.appendChild(btn);
  }
}

function updateTilePicker(): void {
  const buttons = tilePicker.querySelectorAll('button');
  buttons.forEach(btn => {
    const id = parseInt(btn.dataset.tileId || '0', 10);
    btn.classList.toggle('active', id === state.selectedTile);
  });
}

// ============================================================================
// Event Log
// ============================================================================

function addLogEntry(message: string): void {
  const entry = document.createElement('div');
  entry.className = 'log-entry';

  const time = document.createElement('span');
  time.className = 'time';
  const now = new Date();
  time.textContent = `[${now.toLocaleTimeString()}]`;

  const msg = document.createElement('span');
  msg.className = 'msg';
  msg.textContent = ` ${message}`;

  entry.appendChild(time);
  entry.appendChild(msg);

  eventLog.appendChild(entry);
  eventLog.scrollTop = eventLog.scrollHeight;

  // Keep only last 50 entries
  while (eventLog.children.length > 50) {
    eventLog.removeChild(eventLog.firstChild!);
  }
}

// ============================================================================
// Tile Editing
// ============================================================================

let lastEditedTile: { x: number; y: number } | null = null;

function handleTileEditing(): void {
  if (!state.mouse.leftDown && !state.mouse.rightDown) {
    lastEditedTile = null;
    return;
  }

  const gridCoord = world.worldToGrid(state.mouse.worldX, state.mouse.worldY);

  // Avoid editing the same tile multiple times in one frame
  if (lastEditedTile && lastEditedTile.x === gridCoord.globalTileX && lastEditedTile.y === gridCoord.globalTileY) {
    return;
  }

  if (state.mouse.leftDown) {
    // Place tile
    world.setTileAt(state.mouse.worldX, state.mouse.worldY, state.selectedTile);
    lastEditedTile = { x: gridCoord.globalTileX, y: gridCoord.globalTileY };
  } else if (state.mouse.rightDown) {
    // Remove tile (set to empty)
    world.setTileAt(state.mouse.worldX, state.mouse.worldY, TILES.EMPTY);
    lastEditedTile = { x: gridCoord.globalTileX, y: gridCoord.globalTileY };
  }
}

// ============================================================================
// Game Loop
// ============================================================================

let lastTime = performance.now();
let fpsAccumulator = 0;
let fpsFrameCount = 0;

function update(deltaTime: number): void {
  // Player movement
  let dx = 0;
  let dy = 0;

  if (state.keys.has('w') || state.keys.has('arrowup')) dy -= 1;
  if (state.keys.has('s') || state.keys.has('arrowdown')) dy += 1;
  if (state.keys.has('a') || state.keys.has('arrowleft')) dx -= 1;
  if (state.keys.has('d') || state.keys.has('arrowright')) dx += 1;

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  const moveSpeed = state.player.speed * deltaTime;
  const newX = state.player.x + dx * moveSpeed;
  const newY = state.player.y + dy * moveSpeed;

  // Collision detection
  if (state.collisions) {
    // Check X movement
    if (dx !== 0 && world.isPassable(newX, state.player.y)) {
      state.player.x = newX;
    }
    // Check Y movement
    if (dy !== 0 && world.isPassable(state.player.x, newY)) {
      state.player.y = newY;
    }
  } else {
    state.player.x = newX;
    state.player.y = newY;
  }

  // Camera follow
  if (state.camera.smooth) {
    const smoothing = 0.1;
    state.camera.x += (state.player.x - state.camera.x) * smoothing;
    state.camera.y += (state.player.y - state.camera.y) * smoothing;
  } else {
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
  }

  // Auto load radius: compute from viewport and scale
  if (state.autoLoadRadius) {
    const chunkPixelSize = state.chunkSize * state.tileSize;
    const vpW = canvas.width;
    const vpH = canvas.height;
    const visibleHalfW = vpW / (2 * state.camera.scale);
    const visibleHalfH = vpH / (2 * state.camera.scale);
    const chunksW = Math.ceil(visibleHalfW / chunkPixelSize);
    const chunksH = Math.ceil(visibleHalfH / chunkPixelSize);
    const needed = Math.min(Math.max(chunksW, chunksH) + 1, 50); // cap at 50 to avoid freezes
    world.config.loadRadius = needed;
    valLoadRadius.textContent = `${needed} (auto)`;
  }

  // Update world chunks
  world.update(state.player.x, state.player.y);

  // Tile editing
  handleTileEditing();
}

function render(): void {
  const vpW = canvas.width;
  const vpH = canvas.height;

  // Clear
  ctx.fillStyle = '#0a0b0d';
  ctx.fillRect(0, 0, vpW, vpH);

  // Get loaded chunks
  const chunks = world.getLoadedChunks();
  state.loadedChunks = chunks.length;

  // Render chunks (LOD is selected internally by viewManager)
  viewManager.render(chunks, ctx, state.camera.x, state.camera.y, vpW, vpH, state.camera.scale);

  // Debug: draw chunk borders colored by LOD level
  if (state.camera.scale > 0.05) {
    const lodManager = viewManager['lodManager'] as LODManager;
    const lod = lodManager.getLevelForScale(state.camera.scale);
    const chunkPixelSize = state.chunkSize * state.tileSize;

    // LOD colors: green (0) -> yellow (2) -> red (5)
    const lodColors = ['#4ade80', '#86efac', '#f5c842', '#f59e0b', '#f87171', '#ef4444'];
    const color = lodColors[Math.min(lod, lodColors.length - 1)];

    ctx.save();
    ctx.translate(vpW / 2, vpH / 2);
    ctx.scale(state.camera.scale, state.camera.scale);
    ctx.translate(-state.camera.x, -state.camera.y);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / state.camera.scale;
    ctx.globalAlpha = 0.5;

    for (const chunk of chunks) {
      const cx = chunk.x * chunkPixelSize;
      const cy = chunk.y * chunkPixelSize;
      ctx.strokeRect(cx, cy, chunkPixelSize, chunkPixelSize);
    }

    ctx.restore();
  }

  // Draw player
  ctx.save();
  ctx.translate(vpW / 2, vpH / 2);
  ctx.scale(state.camera.scale, state.camera.scale);

  // Player shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Player body
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();

  // Player outline
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Direction indicator
  const dirX = state.mouse.worldX - state.player.x;
  const dirY = state.mouse.worldY - state.player.y;
  const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc((dirX / dirLen) * 6, (dirY / dirLen) * 6, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Draw tile hover highlight
  if (state.camera.scale > 0.3) {
    const gridCoord = world.worldToGrid(state.mouse.worldX, state.mouse.worldY);
    const tileWorldX = gridCoord.globalTileX * state.tileSize;
    const tileWorldY = gridCoord.globalTileY * state.tileSize;

    ctx.save();
    ctx.translate(vpW / 2, vpH / 2);
    ctx.scale(state.camera.scale, state.camera.scale);
    ctx.translate(-state.camera.x, -state.camera.y);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2 / state.camera.scale;
    ctx.strokeRect(tileWorldX, tileWorldY, state.tileSize, state.tileSize);

    ctx.restore();
  }

  // Render minimap
  renderMinimap();
}

function renderMinimap(): void {
  const mw = minimapCanvas.width;
  const mh = minimapCanvas.height;

  minimapCtx.fillStyle = '#0a0b0d';
  minimapCtx.fillRect(0, 0, mw, mh);

  const chunks = world.getLoadedChunks();
  const chunkPixelSize = state.chunkSize * state.tileSize;

  // Scale minimap to show loaded area
  const viewRange = chunkPixelSize * (state.loadRadius + 1);

  for (const chunk of chunks) {
    const chunkWorldX = chunk.x * chunkPixelSize;
    const chunkWorldY = chunk.y * chunkPixelSize;

    // Map to minimap coordinates
    const mx = ((chunkWorldX - state.player.x) / viewRange + 0.5) * mw;
    const my = ((chunkWorldY - state.player.y) / viewRange + 0.5) * mh;
    const mSize = (chunkPixelSize / viewRange) * mw;

    // Draw chunk tiles (simplified)
    const rawData = chunk.getRawData();
    const tileMSize = mSize / chunk.size;

    for (let y = 0; y < chunk.size; y++) {
      for (let x = 0; x < chunk.size; x++) {
        const tileId = rawData[y * chunk.size + x];
        if (tileId === 0) continue;

        const def = TILE_DEFS.find(d => d.id === tileId);
        if (!def) continue;

        minimapCtx.fillStyle = def.color;
        minimapCtx.fillRect(
          mx + x * tileMSize,
          my + y * tileMSize,
          Math.ceil(tileMSize),
          Math.ceil(tileMSize)
        );
      }
    }
  }

  // Draw player dot
  minimapCtx.fillStyle = '#e74c3c';
  minimapCtx.beginPath();
  minimapCtx.arc(mw / 2, mh / 2, 3, 0, Math.PI * 2);
  minimapCtx.fill();
  minimapCtx.strokeStyle = '#fff';
  minimapCtx.lineWidth = 1;
  minimapCtx.stroke();
}

function updateHUD(): void {
  // FPS
  hudFps.textContent = state.fps.toFixed(0);
  hudFps.style.color = state.fps >= 50 ? '#4ade80' : state.fps >= 30 ? '#f5c842' : '#f87171';

  // Player
  hudPlayer.textContent = `${state.player.x.toFixed(0)}, ${state.player.y.toFixed(0)}`;

  // Current chunk
  const chunkCoord = world.worldToChunk(state.player.x, state.player.y);
  hudChunk.textContent = `${chunkCoord.chunkX}, ${chunkCoord.chunkY}`;

  // Tile under mouse
  const tileId = world.getTileAt(state.mouse.worldX, state.mouse.worldY);
  const tileDef = TILE_DEFS.find(d => d.id === tileId);
  hudTile.textContent = tileDef ? `${tileDef.name} (${tileId})` : `unknown (${tileId})`;

  // Passable
  const passable = world.isPassable(state.mouse.worldX, state.mouse.worldY);
  hudPassable.textContent = passable ? '✓ yes' : '✗ no';
  hudPassable.style.color = passable ? '#4ade80' : '#f87171';

  // Loaded chunks
  hudLoaded.textContent = `${state.loadedChunks} chunks`;

  // Scale
  hudScale.textContent = state.camera.scale.toFixed(2);

  // LOD
  const lodManager = viewManager['lodManager'] as LODManager;
  const lod = lodManager.getLevelForScale(state.camera.scale);
  hudLod.textContent = `${lod} / ${lodManager.maxLevel}`;

  // LOD canvas/tile size info
  const lodTileSize = lodManager.getTileSizeForLOD(state.tileSize, lod);
  const lodCanvasSize = lodManager.getCanvasSizeForLOD(state.chunkSize, state.tileSize, lod);
  hudLodCanvas.textContent = `${lodCanvasSize}×${lodCanvasSize}px`;
  hudLodTile.textContent = `${lodTileSize}px`;

  // Stats
  statLoaded.textContent = state.loadedChunks.toString();
  const chunkPixelSize = state.chunkSize * state.tileSize;
  const tilesPerChunk = state.chunkSize * state.chunkSize;
  statTiles.textContent = (state.loadedChunks * tilesPerChunk).toLocaleString();
  statFrames.textContent = state.totalFrames.toLocaleString();
  statFrametime.textContent = `${state.frameTime.toFixed(1)}ms`;
}

function gameLoop(currentTime: number): void {
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap at 100ms
  lastTime = currentTime;

  // FPS calculation
  fpsAccumulator += deltaTime;
  fpsFrameCount++;
  if (fpsAccumulator >= 0.5) {
    state.fps = fpsFrameCount / fpsAccumulator;
    fpsAccumulator = 0;
    fpsFrameCount = 0;
  }

  // Update
  const frameStart = performance.now();
  update(deltaTime);
  render();
  state.frameTime = performance.now() - frameStart;

  state.totalFrames++;
  state.frameCount++;

  // Update HUD every few frames
  if (state.frameCount % 3 === 0) {
    updateHUD();
  }

  requestAnimationFrame(gameLoop);
}

// ============================================================================
// Initialization
// ============================================================================

function init(): void {
  setupInput();
  setupControls();
  createWorld();

  addLogEntry('Demo initialized. Use WASD to move, scroll to zoom.');
  addLogEntry('Left-click to place tiles, right-click to remove.');

  requestAnimationFrame(gameLoop);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
