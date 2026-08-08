import type { Chunk } from '../types/Chunk';
import type { WorldConfig, WorldDimensions } from '../types/Config';
import type { WorldEvents } from '../types/Events';
import type { ChunkGenerator } from '../types/Generator';
import type { TileDefinition, TileId } from '../types/Tile';
import type { WorldCoord, WorldPoint } from '../types/Coordinates';
import { DEFAULT_WORLD_CONFIG, computeDimensions } from '../types/Config';
import { TypedEventBus } from '../utils/EventBus';
import { ChunkManager } from './ChunkManager';
import { CoordinateUtils } from './CoordinateUtils';
import { TileRegistry } from './TileRegistry';
import { DefaultGeneratorRegistry } from './DefaultGeneratorRegistry';

/**
 * Options for creating a World instance.
 */
export interface WorldOptions {
  /** World configuration (chunk size, tile size, etc.) */
  config?: Partial<WorldConfig>;
  /** Base seed for deterministic generation */
  baseSeed?: number;
}

/**
 * Main entry point for the tilemap engine.
 * 
 * The World class provides a unified API for:
 * - Managing chunks (loading/unloading)
 * - Registering generators and tile types
 * - Querying tile data and properties
 * - Coordinate transformations
 * 
 * @example
 * ```typescript
 * const world = new World({
 *   config: { chunkSize: 16, tileSize: 32 },
 *   baseSeed: 12345,
 * });
 * 
 * // Register tile types
 * world.registerTile({ id: 1, name: 'wall', passable: false });
 * world.registerTile({ id: 2, name: 'floor', passable: true });
 * 
 * // Register a generator
 * world.registerGenerator(new MyGenerator());
 * 
 * // Update around player
 * world.update(playerX, playerY);
 * 
 * // Query tiles
 * const tileId = world.getTileAt(100, 200);
 * const isPassable = world.isPassable(100, 200);
 * ```
 */
export class World {
  public readonly config: WorldConfig;
  public readonly dimensions: WorldDimensions;
  public readonly events: TypedEventBus<WorldEvents>;
  public readonly tiles: TileRegistry;
  public readonly coords: CoordinateUtils;
  
  private readonly generators: DefaultGeneratorRegistry;
  private readonly chunks: ChunkManager;

  constructor(options: WorldOptions = {}) {
    this.config = { ...DEFAULT_WORLD_CONFIG, ...options.config };
    this.dimensions = computeDimensions(this.config);
    this.events = new TypedEventBus<WorldEvents>();
    this.tiles = new TileRegistry();
    this.coords = new CoordinateUtils(this.config);
    this.generators = new DefaultGeneratorRegistry();
    this.chunks = new ChunkManager(
      this.config,
      this.generators,
      this.events,
      options.baseSeed ?? 0
    );
  }

  // ============================================================================
  // Chunk Management
  // ============================================================================

  /**
   * Updates loaded chunks based on a center position.
   * Should be called every frame or when the player moves significantly.
   * 
   * @param worldX - Center X coordinate in world pixels
   * @param worldY - Center Y coordinate in world pixels
   */
  update(worldX: number, worldY: number): void {
    this.chunks.update(worldX, worldY);
  }

  /**
   * Gets a chunk at the given coordinates, or null if not loaded.
   */
  getChunk(chunkX: number, chunkY: number): Chunk | null {
    return this.chunks.getChunk(chunkX, chunkY);
  }

  /**
   * Returns all currently loaded chunks.
   */
  getLoadedChunks(): Chunk[] {
    return this.chunks.getLoadedChunks();
  }

  /**
   * Checks if a chunk is loaded.
   */
  isChunkLoaded(chunkX: number, chunkY: number): boolean {
    return this.chunks.isLoaded(chunkX, chunkY);
  }

  /**
   * Forces regeneration of a specific chunk.
   */
  regenerateChunk(chunkX: number, chunkY: number): void {
    this.chunks.regenerateChunk(chunkX, chunkY);
  }

  // ============================================================================
  // Generator Management
  // ============================================================================

  /**
   * Registers a chunk generator.
   * @param generator - The generator to register
   * @param priority - Optional priority (higher = preferred)
   */
  registerGenerator(generator: ChunkGenerator, priority?: number): void {
    this.generators.register(generator, priority);
  }

  /**
   * Unregisters a chunk generator by ID.
   */
  unregisterGenerator(id: string): void {
    this.generators.unregister(id);
  }

  // ============================================================================
  // Tile Registration
  // ============================================================================

  /**
   * Registers a tile definition.
   */
  registerTile(definition: TileDefinition): void {
    this.tiles.register(definition);
  }

  /**
   * Registers or updates a tile definition.
   */
  registerOrUpdateTile(definition: TileDefinition): void {
    this.tiles.registerOrUpdate(definition);
  }

  // ============================================================================
  // Tile Queries
  // ============================================================================

  /**
   * Gets the tile ID at world coordinates.
   * Returns 0 (empty) if the chunk is not loaded or coordinates are invalid.
   */
  getTileAt(worldX: number, worldY: number): TileId {
    const coord = this.coords.worldToGrid(worldX, worldY);
    const chunk = this.chunks.getChunk(coord.chunkX, coord.chunkY);
    if (!chunk) return 0;
    return chunk.getTile(coord.localX, coord.localY);
  }

  /**
   * Gets the tile ID at global tile coordinates.
   */
  getTileAtTile(tileX: number, tileY: number): TileId {
    const chunkCoord = this.coords.tileToChunk(tileX, tileY);
    const chunk = this.chunks.getChunk(chunkCoord.chunkX, chunkCoord.chunkY);
    if (!chunk) return 0;
    const localX = this.coords.globalToLocal(tileX);
    const localY = this.coords.globalToLocal(tileY);
    return chunk.getTile(localX, localY);
  }

  /**
   * Sets the tile ID at world coordinates.
   * Returns false if the chunk is not loaded.
   */
  setTileAt(worldX: number, worldY: number, tileId: TileId): boolean {
    const coord = this.coords.worldToGrid(worldX, worldY);
    const chunk = this.chunks.getChunk(coord.chunkX, coord.chunkY);
    if (!chunk) return false;
    chunk.setTile(coord.localX, coord.localY, tileId);
    this.events.emit('chunkModified', {
      chunk,
      chunkX: coord.chunkX,
      chunkY: coord.chunkY,
      localX: coord.localX,
      localY: coord.localY,
    });
    return true;
  }

  /**
   * Checks if a world position is passable.
   * Returns true if chunk is not loaded (treats unknown as passable).
   */
  isPassable(worldX: number, worldY: number): boolean {
    const tileId = this.getTileAt(worldX, worldY);
    return this.tiles.isPassable(tileId);
  }

  /**
   * Checks if a world position is opaque (blocks line of sight).
   */
  isOpaque(worldX: number, worldY: number): boolean {
    const tileId = this.getTileAt(worldX, worldY);
    return this.tiles.isOpaque(tileId);
  }

  /**
   * Gets the full tile definition at world coordinates.
   * Returns undefined if chunk is not loaded or tile is not registered.
   */
  getTileDefinition(worldX: number, worldY: number): TileDefinition | undefined {
    const tileId = this.getTileAt(worldX, worldY);
    return this.tiles.get(tileId);
  }

  // ============================================================================
  // Raycasting and Pathfinding Helpers
  // ============================================================================

  /**
   * Checks if there's a clear line of sight between two points.
   * Uses Bresenham-like stepping with a configurable step size.
   * 
   * @param startX - Start X in world pixels
   * @param startY - Start Y in world pixels
   * @param endX - End X in world pixels
   * @param endY - End Y in world pixels
   * @param stepSize - Distance between checks (default: 4 pixels)
   * @returns true if line of sight is clear
   */
  hasLineOfSight(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    stepSize: number = 4
  ): boolean {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy);
    
    if (distance === 0) return true;

    const steps = Math.ceil(distance / stepSize);
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 1; i <= steps; i++) {
      const x = startX + stepX * i;
      const y = startY + stepY * i;
      if (!this.isPassable(x, y)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets passable neighbors for a global tile coordinate.
   * Returns coordinates of neighboring tiles that are passable.
   * 
   * @param tileX - Global tile X
   * @param tileY - Global tile Y
   * @param includeDiagonals - Whether to include diagonal neighbors
   */
  getPassableNeighbors(
    tileX: number,
    tileY: number,
    includeDiagonals: boolean = true
  ): Array<{ x: number; y: number }> {
    const neighbors: Array<{ x: number; y: number }> = [];
    const directions = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
    ];

    if (includeDiagonals) {
      directions.push(
        { dx: -1, dy: -1 },
        { dx: 1, dy: -1 },
        { dx: -1, dy: 1 },
        { dx: 1, dy: 1 }
      );
    }

    for (const dir of directions) {
      const nx = tileX + dir.dx;
      const ny = tileY + dir.dy;
      
      // For diagonal neighbors, check that both orthogonal neighbors are passable
      if (dir.dx !== 0 && dir.dy !== 0) {
        const horPassable = this.isPassable((tileX + dir.dx) * this.config.tileSize, tileY * this.config.tileSize);
        const verPassable = this.isPassable(tileX * this.config.tileSize, (tileY + dir.dy) * this.config.tileSize);
        if (!horPassable || !verPassable) continue;
      }

      if (this.isPassable(nx * this.config.tileSize, ny * this.config.tileSize)) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }

  // ============================================================================
  // Coordinate Transformations (convenience methods)
  // ============================================================================

  /**
   * Converts world coordinates to grid coordinates.
   */
  worldToGrid(worldX: number, worldY: number): WorldCoord {
    return this.coords.worldToGrid(worldX, worldY);
  }

  /**
   * Converts world coordinates to chunk coordinates.
   */
  worldToChunk(worldX: number, worldY: number): { chunkX: number; chunkY: number } {
    return this.coords.worldToChunk(worldX, worldY);
  }

  /**
   * Converts global tile coordinates to world pixel coordinates.
   */
  tileToWorld(tileX: number, tileY: number): WorldPoint {
    return this.coords.tileToWorld(tileX, tileY);
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Unloads all chunks and clears all events.
   */
  dispose(): void {
    this.chunks.clear();
    this.events.off();
  }
}
