import type { Chunk as IChunk, ChunkOptions } from '../types/Chunk';
import type { TileId } from '../types/Tile';

/**
 * Default implementation of a chunk using Uint8Array for storage.
 * 
 * Stores tile IDs in a flat array for efficient access and memory usage.
 * Supports tiles with IDs 0-255. For larger tile ID ranges, use Uint16Chunk.
 */
export class Chunk implements IChunk {
  public readonly x: number;
  public readonly y: number;
  public readonly size: number;
  public readonly seed: number;
  public generation: number = 0;
  
  private readonly tiles: Uint8Array;
  private dirty: boolean = true;

  constructor(options: ChunkOptions) {
    if (options.size <= 0) {
      throw new Error('Chunk size must be greater than 0');
    }
    if (options.size > 256) {
      throw new Error('Chunk size must be 256 or less for Uint8Array chunks');
    }

    this.x = options.x;
    this.y = options.y;
    this.size = options.size;
    this.seed = options.seed;
    this.tiles = new Uint8Array(options.size * options.size);
  }

  /**
   * Gets the tile ID at the specified local coordinates.
   */
  getTile(localX: number, localY: number): TileId {
    if (!this.isValidCoord(localX, localY)) {
      return 0;
    }
    return this.tiles[localY * this.size + localX];
  }

  /**
   * Sets the tile ID at the specified local coordinates.
   */
  setTile(localX: number, localY: number, tileId: TileId): void {
    if (!this.isValidCoord(localX, localY)) {
      return;
    }
    
    const index = localY * this.size + localX;
    const currentTile = this.tiles[index];
    
    if (currentTile !== tileId) {
      this.tiles[index] = tileId;
      this.generation++;
      this.dirty = true;
    }
  }

  /**
   * Fills a rectangular area with a specific tile.
   */
  fillRect(x: number, y: number, width: number, height: number, tileId: TileId): void {
    const startX = Math.max(0, x);
    const startY = Math.max(0, y);
    const endX = Math.min(this.size, x + width);
    const endY = Math.min(this.size, y + height);

    let modified = false;
    for (let cy = startY; cy < endY; cy++) {
      for (let cx = startX; cx < endX; cx++) {
        const index = cy * this.size + cx;
        if (this.tiles[index] !== tileId) {
          this.tiles[index] = tileId;
          modified = true;
        }
      }
    }

    if (modified) {
      this.generation++;
      this.dirty = true;
    }
  }

  /**
   * Fills the entire chunk with a single tile.
   */
  fill(tileId: TileId): void {
    this.fillRect(0, 0, this.size, this.size, tileId);
  }

  /**
   * Returns the raw tile data array.
   */
  getRawData(): Uint8Array {
    return this.tiles;
  }

  /**
   * Marks the chunk as dirty.
   */
  markDirty(): void {
    this.dirty = true;
  }

  /**
   * Checks if the chunk is dirty.
   */
  isDirty(): boolean {
    return this.dirty;
  }

  /**
   * Clears the dirty flag (call after rendering).
   */
  clearDirty(): void {
    this.dirty = false;
  }

  /**
   * Checks if coordinates are valid within the chunk.
   */
  private isValidCoord(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }
}

/**
 * Chunk implementation using Uint16Array for larger tile ID ranges.
 * Supports tiles with IDs 0-65535.
 */
export class Uint16Chunk implements IChunk {
  public readonly x: number;
  public readonly y: number;
  public readonly size: number;
  public readonly seed: number;
  public generation: number = 0;
  
  private readonly tiles: Uint16Array;
  private dirty: boolean = true;

  constructor(options: ChunkOptions) {
    if (options.size <= 0) {
      throw new Error('Chunk size must be greater than 0');
    }

    this.x = options.x;
    this.y = options.y;
    this.size = options.size;
    this.seed = options.seed;
    this.tiles = new Uint16Array(options.size * options.size);
  }

  getTile(localX: number, localY: number): TileId {
    if (!this.isValidCoord(localX, localY)) {
      return 0;
    }
    return this.tiles[localY * this.size + localX];
  }

  setTile(localX: number, localY: number, tileId: TileId): void {
    if (!this.isValidCoord(localX, localY)) {
      return;
    }
    
    const index = localY * this.size + localX;
    const currentTile = this.tiles[index];
    
    if (currentTile !== tileId) {
      this.tiles[index] = tileId;
      this.generation++;
      this.dirty = true;
    }
  }

  fillRect(x: number, y: number, width: number, height: number, tileId: TileId): void {
    const startX = Math.max(0, x);
    const startY = Math.max(0, y);
    const endX = Math.min(this.size, x + width);
    const endY = Math.min(this.size, y + height);

    let modified = false;
    for (let cy = startY; cy < endY; cy++) {
      for (let cx = startX; cx < endX; cx++) {
        const index = cy * this.size + cx;
        if (this.tiles[index] !== tileId) {
          this.tiles[index] = tileId;
          modified = true;
        }
      }
    }

    if (modified) {
      this.generation++;
      this.dirty = true;
    }
  }

  fill(tileId: TileId): void {
    this.fillRect(0, 0, this.size, this.size, tileId);
  }

  getRawData(): Uint16Array {
    return this.tiles;
  }

  markDirty(): void {
    this.dirty = true;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  clearDirty(): void {
    this.dirty = false;
  }

  private isValidCoord(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }
}
