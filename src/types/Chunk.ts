import type { TileId } from './Tile';

/**
 * Represents a chunk of the world containing a grid of tiles.
 * 
 * Chunks are the fundamental unit of world management. They are loaded/unloaded
 * based on player position and can be generated procedurally.
 */
export interface Chunk {
  /** X coordinate of this chunk in the chunk grid */
  readonly x: number;
  /** Y coordinate of this chunk in the chunk grid */
  readonly y: number;
  /** Number of tiles per side (chunk is always square) */
  readonly size: number;
  /** Generation counter - increments when chunk data changes */
  generation: number;
  /** Seed used to generate this chunk (for deterministic regeneration) */
  readonly seed: number;
  
  /**
   * Gets the tile ID at the specified local coordinates.
   * @param localX - X coordinate within the chunk (0 to size-1)
   * @param localY - Y coordinate within the chunk (0 to size-1)
   * @returns The tile ID at the position, or 0 if out of bounds
   */
  getTile(localX: number, localY: number): TileId;
  
  /**
   * Sets the tile ID at the specified local coordinates.
   * Increments the generation counter.
   * @param localX - X coordinate within the chunk (0 to size-1)
   * @param localY - Y coordinate within the chunk (0 to size-1)
   * @param tileId - The tile ID to set
   */
  setTile(localX: number, localY: number, tileId: TileId): void;
  
  /**
   * Fills a rectangular area with a specific tile.
   * @param x - Starting X coordinate
   * @param y - Starting Y coordinate
   * @param width - Width of the rectangle
   * @param height - Height of the rectangle
   * @param tileId - The tile ID to fill with
   */
  fillRect(x: number, y: number, width: number, height: number, tileId: TileId): void;
  
  /**
   * Fills the entire chunk with a single tile ID.
   * Increments the generation counter if any tiles change.
   * @param tileId - The tile ID to fill with
   */
  fill(tileId: TileId): void;
  
  /**
   * Returns the raw tile data array for efficient iteration.
   * The array is in row-major order: index = y * size + x
   */
  getRawData(): ReadonlyArray<TileId> | Uint8Array | Uint16Array;
  
  /**
   * Marks the chunk as dirty (needs re-rendering).
   */
  markDirty(): void;
  
  /**
   * Checks if the chunk has been modified since last render.
   */
  isDirty(): boolean;
  
  /**
   * Clears the dirty flag. Call this after the chunk has been rendered.
   */
  clearDirty(): void;
}

/**
 * Options for creating a new chunk.
 */
export interface ChunkOptions {
  x: number;
  y: number;
  size: number;
  /** Per-chunk seed — unique for this chunk position. Use for discrete decisions
   *  (structure placement, random counts, decorations). */
  seed: number;
  /** World seed — same for ALL chunks. Use as the seed for noise functions
   *  (ValueNoise2D, etc.) and sample with WORLD coordinates to ensure
   *  seamless continuity across chunk boundaries. */
  worldSeed: number;
}
