import type { Chunk } from '../types/Chunk';
import type { WorldConfig } from '../types/Config';
import type { ChunkRenderer } from '../types/Renderer';
import { LODManager, DEFAULT_LOD_CONFIG } from './LODManager';

/**
 * Configuration for the chunk view manager.
 */
export interface ChunkViewManagerConfig {
  /** World configuration */
  worldConfig: WorldConfig;
  /** Chunk renderer */
  renderer: ChunkRenderer<CanvasRenderingContext2D>;
  /** LOD manager (optional) */
  lodManager?: LODManager;
}

/**
 * Manages rendering of multiple chunks with frustum culling and LOD.
 * 
 * This class coordinates the rendering of all visible chunks,
 * handling frustum culling (only drawing chunks that are visible)
 * and LOD selection based on camera scale.
 * 
 * @example
 * ```typescript
 * const viewManager = new ChunkViewManager({
 *   worldConfig: world.config,
 *   renderer: canvasRenderer,
 * });
 * 
 * // In your render loop:
 * viewManager.render(
 *   world.getLoadedChunks(),
 *   ctx,
 *   camera.x,
 *   camera.y,
 *   canvas.width,
 *   canvas.height,
 *   camera.scale
 * );
 * ```
 */
export class ChunkViewManager {
  private readonly worldConfig: WorldConfig;
  private readonly renderer: ChunkRenderer<CanvasRenderingContext2D>;
  private readonly lodManager: LODManager;

  constructor(config: ChunkViewManagerConfig) {
    this.worldConfig = config.worldConfig;
    this.renderer = config.renderer;
    this.lodManager = config.lodManager ?? new LODManager(DEFAULT_LOD_CONFIG);
  }

  /**
   * Renders all visible chunks.
   * 
   * @param chunks - Array of loaded chunks
   * @param ctx - Target canvas rendering context
   * @param cameraX - Camera center X in world coordinates
   * @param cameraY - Camera center Y in world coordinates
   * @param viewportWidth - Viewport width in pixels
   * @param viewportHeight - Viewport height in pixels
   * @param scale - Camera scale (1 = 100%)
   */
  render(
    chunks: Chunk[],
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    viewportWidth: number,
    viewportHeight: number,
    scale: number = 1
  ): void {
    const lod = this.lodManager.getLevelForScale(scale);
    const chunkPixelSize = this.worldConfig.chunkSize * this.worldConfig.tileSize;
    
    // Calculate visible bounds in world coordinates
    const halfViewportW = viewportWidth / (2 * scale);
    const halfViewportH = viewportHeight / (2 * scale);
    
    const visibleMinX = cameraX - halfViewportW;
    const visibleMinY = cameraY - halfViewportH;
    const visibleMaxX = cameraX + halfViewportW;
    const visibleMaxY = cameraY + halfViewportH;

    ctx.save();
    
    // Apply camera transform
    ctx.translate(viewportWidth / 2, viewportHeight / 2);
    ctx.scale(scale, scale);
    ctx.translate(-cameraX, -cameraY);

    for (const chunk of chunks) {
      // Calculate chunk world position
      const chunkWorldX = chunk.x * chunkPixelSize;
      const chunkWorldY = chunk.y * chunkPixelSize;
      
      // Frustum culling
      if (chunkWorldX + chunkPixelSize < visibleMinX) continue;
      if (chunkWorldY + chunkPixelSize < visibleMinY) continue;
      if (chunkWorldX > visibleMaxX) continue;
      if (chunkWorldY > visibleMaxY) continue;

      // Render chunk
      this.renderer.render(chunk, ctx, chunkWorldX, chunkWorldY, scale, lod);
    }

    ctx.restore();
  }

  /**
   * Clears all renderer caches.
   */
  clearCache(): void {
    this.renderer.clearCache();
  }

  /**
   * Disposes of all resources.
   */
  dispose(): void {
    this.renderer.dispose();
  }
}
