/**
 * Configuration for the world/chunk system.
 */
export interface WorldConfig {
  /** Number of tiles per chunk side (chunk is always square) */
  chunkSize: number;
  
  /** Size of each tile in pixels */
  tileSize: number;
  
  /** Number of chunks to load around the player (half-width) */
  loadRadius: number;
  
  /** Number of chunks beyond load radius before unloading */
  unloadBuffer: number;
}

/**
 * Default world configuration.
 */
export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  chunkSize: 16,
  tileSize: 32,
  loadRadius: 3,
  unloadBuffer: 2,
};

/**
 * Computed world dimensions.
 */
export interface WorldDimensions {
  /** Full size of a chunk in pixels */
  chunkPixelSize: number;
  /** Half size of a chunk in pixels */
  chunkHalfPixelSize: number;
}

/**
 * Computes world dimensions from config.
 */
export function computeDimensions(config: WorldConfig): WorldDimensions {
  const chunkPixelSize = config.chunkSize * config.tileSize;
  return {
    chunkPixelSize,
    chunkHalfPixelSize: Math.floor(chunkPixelSize / 2),
  };
}
