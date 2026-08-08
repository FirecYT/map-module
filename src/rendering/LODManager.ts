/**
 * Configuration for LOD (Level of Detail) management.
 */
export interface LODConfig {
  /** Maximum number of LOD levels (0 = highest detail) */
  maxLevels: number;
  
  /** Scale thresholds for each LOD level */
  thresholds: number[];
}

/**
 * Default LOD configuration.
 * LOD 0: scale >= 0.75 (close up)
 * LOD 1: scale >= 0.5
 * LOD 2: scale >= 0.25
 * LOD 3: scale < 0.25 (zoomed out)
 */
export const DEFAULT_LOD_CONFIG: LODConfig = {
  maxLevels: 4,
  thresholds: [0.75, 0.5, 0.25],
};

/**
 * Manages Level of Detail selection based on viewport scale.
 * 
 * Higher LOD levels render simpler (lower resolution) versions
 * of chunks for better performance when zoomed out.
 */
export class LODManager {
  private readonly config: LODConfig;

  constructor(config: LODConfig = DEFAULT_LOD_CONFIG) {
    this.config = config;
  }

  /**
   * Gets the appropriate LOD level for a given scale.
   * 
   * @param scale - Current viewport scale (1 = 100%)
   * @returns LOD level (0 = highest detail)
   */
  getLevelForScale(scale: number): number {
    for (let i = 0; i < this.config.thresholds.length; i++) {
      if (scale >= this.config.thresholds[i]) {
        return i;
      }
    }
    return this.config.maxLevels - 1;
  }

  /**
   * Gets the tile render size for a given LOD level.
   * 
   * @param baseTileSize - Base tile size in pixels
   * @param lod - LOD level
   * @returns Tile size to render at
   */
  getTileSizeForLOD(baseTileSize: number, lod: number): number {
    return Math.max(1, Math.floor(baseTileSize / Math.pow(2, lod)));
  }

  /**
   * Returns the maximum LOD level.
   */
  get maxLevel(): number {
    return this.config.maxLevels - 1;
  }
}
