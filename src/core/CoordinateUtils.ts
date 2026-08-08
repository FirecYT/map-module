import type { WorldCoord, ChunkCoord, WorldPoint } from '../types/Coordinates';
import type { WorldConfig } from '../types/Config';

/**
 * Utility class for coordinate transformations.
 * 
 * Provides methods to convert between world coordinates (pixels),
 * global tile coordinates, and chunk-local coordinates.
 */
export class CoordinateUtils {
  private readonly chunkSize: number;
  private readonly tileSize: number;
  private readonly chunkPixelSize: number;

  constructor(config: WorldConfig) {
    this.chunkSize = config.chunkSize;
    this.tileSize = config.tileSize;
    this.chunkPixelSize = config.chunkSize * config.tileSize;
  }

  /**
   * Converts world pixel coordinates to chunk coordinates.
   */
  worldToChunk(worldX: number, worldY: number): ChunkCoord {
    const chunkX = Math.floor(worldX / this.chunkPixelSize);
    const chunkY = Math.floor(worldY / this.chunkPixelSize);
    return { chunkX, chunkY };
  }

  /**
   * Converts world pixel coordinates to full world coordinates including local position.
   * Returns null if the chunk is not loaded (for validation purposes).
   */
  worldToGrid(worldX: number, worldY: number): WorldCoord {
    const chunkX = Math.floor(worldX / this.chunkPixelSize);
    const chunkY = Math.floor(worldY / this.chunkPixelSize);
    
    const chunkWorldX = chunkX * this.chunkPixelSize;
    const chunkWorldY = chunkY * this.chunkPixelSize;
    
    const localX = Math.floor((worldX - chunkWorldX) / this.tileSize);
    const localY = Math.floor((worldY - chunkWorldY) / this.tileSize);
    
    const tileX = chunkX * this.chunkSize + localX;
    const tileY = chunkY * this.chunkSize + localY;

    return {
      chunkX,
      chunkY,
      localX,
      localY,
      tileX,
      tileY,
    };
  }

  /**
   * Converts chunk coordinates to world pixel coordinates (top-left corner of chunk).
   */
  chunkToWorld(chunkX: number, chunkY: number): WorldPoint {
    return {
      x: chunkX * this.chunkPixelSize,
      y: chunkY * this.chunkPixelSize,
    };
  }

  /**
   * Converts global tile coordinates to world pixel coordinates (top-left corner of tile).
   */
  tileToWorld(tileX: number, tileY: number): WorldPoint {
    return {
      x: tileX * this.tileSize,
      y: tileY * this.tileSize,
    };
  }

  /**
   * Converts global tile coordinates to chunk coordinates.
   */
  tileToChunk(tileX: number, tileY: number): ChunkCoord {
    const chunkX = Math.floor(tileX / this.chunkSize);
    const chunkY = Math.floor(tileY / this.chunkSize);
    return { chunkX, chunkY };
  }

  /**
   * Gets the local tile coordinate within a chunk from a global tile coordinate.
   */
  globalToLocal(globalCoord: number): number {
    let local = globalCoord % this.chunkSize;
    if (local < 0) local += this.chunkSize;
    return local;
  }

  /**
   * Gets the chunk pixel boundaries for a given chunk.
   */
  getChunkBounds(chunkX: number, chunkY: number): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    const minX = chunkX * this.chunkPixelSize;
    const minY = chunkY * this.chunkPixelSize;
    return {
      minX,
      minY,
      maxX: minX + this.chunkPixelSize,
      maxY: minY + this.chunkPixelSize,
    };
  }

  /**
   * Returns all chunk coordinates within a rectangle in world space.
   */
  getChunksInRect(
    worldX: number,
    worldY: number,
    width: number,
    height: number
  ): ChunkCoord[] {
    const minChunk = this.worldToChunk(worldX, worldY);
    const maxChunk = this.worldToChunk(worldX + width, worldY + height);

    const chunks: ChunkCoord[] = [];
    for (let cy = minChunk.chunkY; cy <= maxChunk.chunkY; cy++) {
      for (let cx = minChunk.chunkX; cx <= maxChunk.chunkX; cx++) {
        chunks.push({ chunkX: cx, chunkY: cy });
      }
    }
    return chunks;
  }

  /**
   * Returns all chunk coordinates within a radius from a center chunk.
   */
  getChunksInRadius(centerX: number, centerY: number, radius: number): ChunkCoord[] {
    const chunks: ChunkCoord[] = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        chunks.push({ chunkX: centerX + dx, chunkY: centerY + dy });
      }
    }
    return chunks;
  }
}
