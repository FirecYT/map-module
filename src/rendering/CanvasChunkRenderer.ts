import type { Chunk } from '../types/Chunk';
import type { TileId } from '../types/Tile';
import type { TileVisual, TileVisualContext, TileVisualProvider } from '../types/Renderer';
import type { TileRegistry } from '../core/TileRegistry';
import type { WorldConfig } from '../types/Config';
import { createCanvas, getCanvasContext, type CanvasType } from './CanvasFactory';

/**
 * Configuration for the canvas chunk renderer.
 */
export interface CanvasRendererConfig {
  /** Registry containing tile definitions (for passability checks etc.) */
  tiles?: TileRegistry;
  /** World configuration (for tile size calculations) */
  worldConfig: WorldConfig;
  /** Map of tile ID to visual provider */
  visuals: Map<TileId, TileVisualProvider>;
  /** Whether to use offscreen canvas caching (default: true) */
  useCache?: boolean;
}

/**
 * Internal cached render data.
 */
interface CachedRender {
  canvas: CanvasType;
  generation: number;
}

/**
 * Renders chunks to a Canvas 2D context with LOD support and offscreen caching.
 * 
 * Features:
 * - OffscreenCanvas/HTMLCanvasElement caching per chunk per LOD level
 * - Automatic cache invalidation when chunk generation changes
 * - Sprite sheet support
 * - Custom visual providers per tile
 * - Framework-agnostic canvas creation (works in main thread and Web Workers)
 * 
 * @example
 * ```typescript
 * const renderer = new CanvasChunkRenderer({
 *   tiles: world.tiles,
 *   worldConfig: world.config,
 *   visuals: new Map([
 *     [1, { color: '#666' }], // Wall
 *     [2, { sprite: floorImage }], // Floor
 *   ]),
 * });
 * 
 * renderer.render(chunk, ctx, 0, 0, 1.0);
 * ```
 */
export class CanvasChunkRenderer {
  private readonly worldConfig: WorldConfig;
  private readonly visuals: Map<TileId, TileVisualProvider>;
  private readonly useCache: boolean;
  
  // Cache: chunkKey -> lod -> { canvas, generation }
  private cache = new Map<string, Map<number, CachedRender>>();

  constructor(config: CanvasRendererConfig) {
    this.worldConfig = config.worldConfig;
    this.visuals = config.visuals;
    this.useCache = config.useCache ?? true;
  }

  /**
   * Renders a chunk to the target context.
   * 
   * @param chunk - The chunk to render
   * @param ctx - Target canvas rendering context
   * @param destX - Destination X in target coordinates
   * @param destY - Destination Y in target coordinates
   * @param scale - Scale factor (1 = normal size)
   * @param lod - Level of detail (0 = highest, higher = simpler)
   */
  render(
    chunk: Chunk,
    ctx: CanvasRenderingContext2D,
    destX: number,
    destY: number,
    scale: number = 1,
    lod: number = 0
  ): void {
    const cached = this.getCachedRender(chunk, lod);
    
    if (cached) {
      // Draw cached offscreen canvas, stretched to the full chunk world-space size.
      // The offscreen canvas may be smaller (for LOD), but it must fill the same
      // world-space area. The camera transform (scale) handles screen-space sizing.
      const chunkPixelSize = this.worldConfig.chunkSize * this.worldConfig.tileSize;
      ctx.drawImage(
        cached.canvas as CanvasImageSource,
        0, 0, cached.canvas.width, cached.canvas.height,
        destX, destY, chunkPixelSize, chunkPixelSize
      );
    } else {
      // Render directly (no caching)
      this.renderDirect(chunk, ctx, destX, destY, scale, lod);
    }
  }

  /**
   * Clears the render cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Disposes of all cached resources.
   */
  dispose(): void {
    this.clearCache();
  }

  /**
   * Updates the visual for a specific tile.
   */
  setVisual(tileId: TileId, visual: TileVisualProvider): void {
    this.visuals.set(tileId, visual);
    this.clearCache(); // Invalidate cache when visuals change
  }

  /**
   * Removes the visual for a specific tile.
   */
  removeVisual(tileId: TileId): void {
    this.visuals.delete(tileId);
    this.clearCache();
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private getCachedRender(chunk: Chunk, lod: number): CachedRender | null {
    if (!this.useCache) return null;

    const chunkKey = `${chunk.x},${chunk.y}`;
    let lodCache = this.cache.get(chunkKey);
    
    if (!lodCache) {
      lodCache = new Map();
      this.cache.set(chunkKey, lodCache);
    }

    const cached = lodCache.get(lod);
    
    // Check if cache is valid
    if (cached && cached.generation === chunk.generation && !chunk.isDirty()) {
      return cached;
    }

    // Create or update cached render
    const render = this.renderToOffscreen(chunk, lod);
    lodCache.set(lod, render);
    
    // Clear dirty flag after rendering
    chunk.clearDirty();
    
    return render;
  }

  private renderToOffscreen(chunk: Chunk, lod: number): CachedRender {
    const tileRenderSize = Math.max(1, Math.floor(this.worldConfig.tileSize / Math.pow(2, lod)));
    const canvasSize = chunk.size * tileRenderSize;

    // Create canvas using factory (supports OffscreenCanvas and HTMLCanvasElement)
    const canvas = createCanvas(canvasSize, canvasSize);
    if (!canvas) {
      throw new Error('Failed to create canvas: no canvas support in this environment');
    }
    
    const ctx = getCanvasContext(canvas);
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // Type guard for context (both CanvasRenderingContext2D and OffscreenCanvasRenderingContext2D have imageSmoothingEnabled)
    const ctx2d = ctx as CanvasRenderingContext2D;
    ctx2d.imageSmoothingEnabled = false;
    this.renderTiles(chunk, ctx2d, tileRenderSize, lod);

    return {
      canvas,
      generation: chunk.generation,
    };
  }

  private renderDirect(
    chunk: Chunk,
    ctx: CanvasRenderingContext2D,
    destX: number,
    destY: number,
    _scale: number,
    lod: number
  ): void {
    const tileRenderSize = Math.max(
      1,
      Math.floor(this.worldConfig.tileSize / Math.pow(2, lod))
    );

    ctx.save();
    ctx.translate(destX, destY);
    ctx.imageSmoothingEnabled = false;
    this.renderTiles(chunk, ctx, tileRenderSize, lod);
    ctx.restore();
  }

  private renderTiles(
    chunk: Chunk,
    ctx: CanvasRenderingContext2D,
    tileRenderSize: number,
    lod: number
  ): void {
    const rawData = chunk.getRawData();
    
    for (let y = 0; y < chunk.size; y++) {
      for (let x = 0; x < chunk.size; x++) {
        const tileId = rawData[y * chunk.size + x];
        
        // Skip empty tiles for performance
        if (tileId === 0) continue;

        const visual = this.resolveVisual(tileId, chunk, x, y);
        if (!visual) continue;

        const drawX = x * tileRenderSize;
        const drawY = y * tileRenderSize;

        this.drawTile(ctx, visual, drawX, drawY, tileRenderSize, lod);
      }
    }
  }

  private resolveVisual(
    tileId: TileId,
    chunk: Chunk,
    localX: number,
    localY: number
  ): TileVisual | null {
    const provider = this.visuals.get(tileId);
    if (!provider) return null;

    if (typeof provider === 'function') {
      const context: TileVisualContext = {
        chunk,
        tileId,
        localX,
        localY,
        globalTileX: chunk.x * chunk.size + localX,
        globalTileY: chunk.y * chunk.size + localY,
      };
      return provider(context);
    }

    return provider;
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    visual: TileVisual,
    x: number,
    y: number,
    size: number,
    _lod: number
  ): void {
    // Draw sprite if available
    if (visual.sprite && visual.spriteRect) {
      const img = visual.sprite as CanvasImageSource;
      const rect = visual.spriteRect;
      ctx.drawImage(
        img,
        rect.x, rect.y, rect.width, rect.height,
        x, y, size, size
      );
      return;
    }

    // Draw full sprite if available
    if (visual.sprite) {
      const img = visual.sprite as CanvasImageSource;
      ctx.drawImage(img, x, y, size, size);
      return;
    }

    // Draw color as fallback
    if (visual.color) {
      ctx.fillStyle = visual.color;
      ctx.fillRect(x, y, size, size);
    }
  }
}
