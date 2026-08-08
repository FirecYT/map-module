import type { Chunk } from './Chunk';
import type { TileId } from './Tile';

/**
 * Represents visual information for rendering a tile.
 */
export interface TileVisual {
  /**
   * Sprite image source (can be HTMLImageElement, HTMLCanvasElement, or URL string).
   */
  sprite?: unknown;
  
  /**
   * Fallback color if sprite is not available.
   * Format: CSS color string (e.g., '#ff0000', 'rgba(255,0,0,0.5)')
   */
  color?: string;
  
  /**
   * Sprite sheet coordinates if using a sprite sheet.
   */
  spriteRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /**
   * Whether to flip the sprite horizontally.
   */
  flipX?: boolean;
  
  /**
   * Whether to flip the sprite vertically.
   */
  flipY?: boolean;
  
  /**
   * Rotation angle in radians.
   */
  rotation?: number;
  
  /**
   * Scale factor (1 = normal size).
   */
  scale?: number;
}

/**
 * Context passed to tile visual providers for dynamic tile visuals.
 */
export interface TileVisualContext {
  /** The chunk containing the tile */
  chunk: Chunk;
  /** Tile ID */
  tileId: TileId;
  /** Local X coordinate within chunk */
  localX: number;
  /** Local Y coordinate within chunk */
  localY: number;
  /** Global X coordinate in world grid */
  globalTileX: number;
  /** Global Y coordinate in world grid */
  globalTileY: number;
}

/**
 * Function that provides visual information for a tile.
 * Can be static (returns same visual) or dynamic (context-dependent).
 */
export type TileVisualProvider = 
  | TileVisual 
  | ((context: TileVisualContext) => TileVisual | null);

/**
 * Interface for chunk renderers.
 * 
 * Renderers are responsible for drawing chunks to a target (e.g., Canvas 2D).
 * They should support caching for performance optimization.
 */
export interface ChunkRenderer<TContext = CanvasRenderingContext2D> {
  /**
   * Renders a chunk to the target context.
   * 
   * @param chunk - The chunk to render
   * @param ctx - The rendering context
   * @param x - X position in the target coordinate system
   * @param y - Y position in the target coordinate system
   * @param scale - Scale factor (1 = normal size)
   * @param lod - Level of detail (0 = highest detail)
   */
  render(
    chunk: Chunk,
    ctx: TContext,
    x: number,
    y: number,
    scale: number,
    lod?: number
  ): void;
  
  /**
   * Clears the renderer's cache.
   * Should be called when tile visuals change or when unloading.
   */
  clearCache(): void;
  
  /**
   * Disposes of renderer resources.
   */
  dispose(): void;
}

/**
 * Level of Detail configuration.
 */
export interface LODConfig {
  /** Maximum number of LOD levels */
  maxLevels: number;
  
  /**
   * Gets the LOD level for a given scale.
   * @param scale - Current camera/viewport scale
   * @returns LOD level (0 = highest detail)
   */
  getLevelForScale(scale: number): number;
}
