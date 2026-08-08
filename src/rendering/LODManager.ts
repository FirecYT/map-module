/**
 * Configuration for LOD (Level of Detail) management.
 */
export interface LODConfig {
  /** Maximum number of LOD levels (0 = highest detail) */
  maxLevels: number;

  /**
   * Scale thresholds for each LOD level (descending order).
   * The first threshold corresponds to LOD 0 (full detail).
   * For log2-based LOD, these are powers of 2: [1.0, 0.5, 0.25, 0.125, ...].
   * 
   * When scale >= threshold[i], LOD i is used.
   * If scale < all thresholds, the maximum LOD level is used.
   */
  thresholds?: number[];
}

/**
 * Default LOD configuration with log2-based thresholds.
 * 
 * Each LOD level corresponds to a 2x zoom-out:
 * - LOD 0: scale >= 1.0   (close-up, full detail: 32px tiles)
 * - LOD 1: scale >= 0.5   (zoomed out 2x: 16px tiles)
 * - LOD 2: scale >= 0.25  (zoomed out 4x: 8px tiles)
 * - LOD 3: scale >= 0.125 (zoomed out 8x: 4px tiles)
 * - LOD 4: scale >= 0.0625 (zoomed out 16x: 2px tiles)
 * - LOD 5: scale < 0.0625  (zoomed out 32x+: 1px tiles, minimum)
 * 
 * With tileSize = 32, LOD 5 is the practical maximum (tile size = 1px).
 * Beyond that, the offscreen canvas cannot be smaller.
 */
export const DEFAULT_LOD_CONFIG: LODConfig = {
  maxLevels: 6,
  thresholds: [1.0, 0.5, 0.25, 0.125, 0.0625],
};

/**
 * Manages Level of Detail selection based on viewport scale.
 * 
 * LOD reduces the offscreen canvas resolution for chunks when zoomed out,
 * improving performance and reducing memory usage. The offscreen canvas
 * is still drawn at full world-space size, but with lower resolution
 * (fewer pixels per tile).
 * 
 * Higher LOD levels = lower resolution = better performance when zoomed out.
 * 
 * Example: at LOD 2, each tile is rendered at 8px instead of 32px,
 * so the offscreen canvas is 4x smaller (128x128 instead of 512x512
 * for a 16x16 chunk).
 */
export class LODManager {
  private readonly config: LODConfig;

  constructor(config: LODConfig = DEFAULT_LOD_CONFIG) {
    this.config = config;
  }

  /**
   * Gets the appropriate LOD level for a given scale.
   * 
   * Uses log2-based calculation: LOD = ceil(-log2(scale)).
   * Clamped to [0, maxLevels - 1].
   * 
   * If custom thresholds are provided, they are used as fallback
   * (for non-power-of-2 scales).
   * 
   * @param scale - Current viewport scale (1.0 = 100%, 0.5 = 50%, etc.)
   * @returns LOD level (0 = highest detail, maxLevels - 1 = lowest detail)
   */
  getLevelForScale(scale: number): number {
    if (scale <= 0) {
      return this.config.maxLevels - 1;
    }

    // Log2-based calculation: each LOD level corresponds to 2x zoom-out
    // lod = ceil(-log2(scale)) = ceil(log2(1/scale))
    const logLod = Math.ceil(-Math.log2(scale));
    const clamped = Math.max(0, Math.min(logLod, this.config.maxLevels - 1));

    // If custom thresholds are provided and scale is within their range,
    // use them for more precise control
    if (this.config.thresholds && scale < this.config.thresholds[0]) {
      for (let i = 0; i < this.config.thresholds.length; i++) {
        if (scale >= this.config.thresholds[i]) {
          return Math.min(i, this.config.maxLevels - 1);
        }
      }
      return this.config.maxLevels - 1;
    }

    return clamped;
  }

  /**
   * Gets the tile render size (in pixels) for a given LOD level.
   * 
   * Formula: max(1, floor(baseTileSize / 2^lod))
   * 
   * @param baseTileSize - Base tile size in pixels (e.g. 32)
   * @param lod - LOD level (0 = highest detail)
   * @returns Tile size to render at (minimum 1 pixel)
   */
  getTileSizeForLOD(baseTileSize: number, lod: number): number {
    return Math.max(1, Math.floor(baseTileSize / Math.pow(2, lod)));
  }

  /**
   * Gets the offscreen canvas size (in pixels) for a given LOD level.
   * 
   * @param chunkSize - Number of tiles per chunk side (e.g. 16)
   * @param baseTileSize - Base tile size in pixels
   * @param lod - LOD level
   * @returns Canvas size (width = height)
   */
  getCanvasSizeForLOD(chunkSize: number, baseTileSize: number, lod: number): number {
    return chunkSize * this.getTileSizeForLOD(baseTileSize, lod);
  }

  /**
   * Returns the maximum LOD level.
   */
  get maxLevel(): number {
    return this.config.maxLevels - 1;
  }

  /**
   * Returns the configuration.
   */
  getConfig(): Readonly<LODConfig> {
    return this.config;
  }
}
