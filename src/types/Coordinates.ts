/**
 * Represents a 2D point with integer or floating-point coordinates.
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Represents a rectangular area with position and dimensions.
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * World coordinates are pixel-based coordinates in the game world.
 */
export type WorldPoint = Point2D;

/**
 * Chunk coordinates identify a specific chunk in the world grid.
 */
export interface ChunkCoord {
  chunkX: number;
  chunkY: number;
}

/**
 * Grid coordinates identify a specific tile within the world grid.
 */
export interface GridCoord {
  tileX: number;
  tileY: number;
}

/**
 * Local tile coordinates within a specific chunk.
 */
export interface LocalTileCoord {
  localX: number;
  localY: number;
}

/**
 * Combined coordinate containing chunk, local, and global information.
 */
export interface WorldCoord extends ChunkCoord {
  localX: number;
  localY: number;
  tileX: number;
  tileY: number;
}

/**
 * A key used to uniquely identify a chunk in maps.
 */
export type ChunkKey = string;

/**
 * Creates a chunk key from coordinates.
 */
export function createChunkKey(chunkX: number, chunkY: number): ChunkKey {
  return `${chunkX},${chunkY}`;
}

/**
 * Parses a chunk key back to coordinates.
 */
export function parseChunkKey(key: ChunkKey): ChunkCoord {
  const [x, y] = key.split(',').map(Number);
  return { chunkX: x, chunkY: y };
}
