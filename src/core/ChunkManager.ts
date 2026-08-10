import type { Chunk } from '../types/Chunk';
import type { ChunkCoord, ChunkKey } from '../types/Coordinates';
import type { WorldConfig } from '../types/Config';
import type { GeneratorRegistry } from '../types/Generator';
import type { WorldEvents } from '../types/Events';
import { createChunkKey } from '../types/Coordinates';
import { TypedEventBus } from '../utils/EventBus';
import { createSeedFromCoords } from '../utils/SeededRandom';

/**
 * Manages chunk lifecycle: loading, unloading, and caching.
 * 
 * The ChunkManager is responsible for:
 * - Loading chunks when they enter the load radius
 * - Unloading chunks when they leave the unload buffer
 * - Generating chunks using registered generators
 * - Emitting events for chunk lifecycle changes
 * 
 * @example
 * ```typescript
 * const manager = new ChunkManager(config, generatorRegistry, events);
 * 
 * // Update around player position
 * manager.update(playerX, playerY);
 * 
 * // Get a specific chunk
 * const chunk = manager.getChunk(5, 10);
 * ```
 */
export class ChunkManager {
  private chunks = new Map<ChunkKey, Chunk>();
  private readonly config: WorldConfig;
  private readonly generators: GeneratorRegistry;
  private readonly events: TypedEventBus<WorldEvents>;
  private baseSeed: number;

  constructor(
    config: WorldConfig,
    generators: GeneratorRegistry,
    events: TypedEventBus<WorldEvents>,
    baseSeed: number = 0
  ) {
    this.config = config;
    this.generators = generators;
    this.events = events;
    this.baseSeed = baseSeed;
  }

  /**
   * Sets the base seed for chunk generation.
   * This affects all subsequently generated chunks.
   */
  setBaseSeed(seed: number): void {
    this.baseSeed = seed;
  }

  /**
   * Updates loaded chunks based on a center position.
   * Loads chunks within loadRadius and unloads chunks beyond loadRadius + unloadBuffer.
   * 
   * @param centerX - Center X coordinate in world space
   * @param centerY - Center Y coordinate in world space
   */
  update(centerX: number, centerY: number): void {
    const centerChunkX = Math.floor(centerX / (this.config.chunkSize * this.config.tileSize));
    const centerChunkY = Math.floor(centerY / (this.config.chunkSize * this.config.tileSize));

    const loadedChunks: ChunkCoord[] = [];
    const unloadedChunks: ChunkCoord[] = [];

    // Load chunks within radius
    for (let dy = -this.config.loadRadius; dy <= this.config.loadRadius; dy++) {
      for (let dx = -this.config.loadRadius; dx <= this.config.loadRadius; dx++) {
        const chunkX = centerChunkX + dx;
        const chunkY = centerChunkY + dy;
        
        if (this.loadChunk(chunkX, chunkY)) {
          loadedChunks.push({ chunkX, chunkY });
        }
      }
    }

    // Unload chunks outside buffer
    const unloadDistance = this.config.loadRadius + this.config.unloadBuffer;
    for (const [key, chunk] of this.chunks.entries()) {
      const distanceX = Math.abs(chunk.x - centerChunkX);
      const distanceY = Math.abs(chunk.y - centerChunkY);
      
      if (distanceX > unloadDistance || distanceY > unloadDistance) {
        this.chunks.delete(key);
        this.events.emit('chunkUnloaded', {
          chunkX: chunk.x,
          chunkY: chunk.y,
        });
        unloadedChunks.push({ chunkX: chunk.x, chunkY: chunk.y });
      }
    }

    if (loadedChunks.length > 0 || unloadedChunks.length > 0) {
      this.events.emit('chunksUpdated', {
        centerX: centerChunkX,
        centerY: centerChunkY,
        loadedChunks,
        unloadedChunks,
      });
    }
  }

  /**
   * Loads a chunk at the given coordinates if not already loaded.
   * @returns true if the chunk was newly loaded, false if already loaded
   */
  loadChunk(chunkX: number, chunkY: number): boolean {
    const key = createChunkKey(chunkX, chunkY);
    
    if (this.chunks.has(key)) {
      return false;
    }

    const generator = this.generators.getGenerator(chunkX, chunkY);
    if (!generator) {
      // No generator available - skip this chunk
      return false;
    }

    const seed = createSeedFromCoords(chunkX, chunkY, this.baseSeed);
    const chunk = generator.generate({
      x: chunkX,
      y: chunkY,
      size: this.config.chunkSize,
      seed,
      worldSeed: this.baseSeed,
    });

    this.chunks.set(key, chunk);
    this.events.emit('chunkLoaded', {
      chunk,
      chunkX,
      chunkY,
    });

    return true;
  }

  /**
   * Gets a chunk by coordinates, or null if not loaded.
   */
  getChunk(chunkX: number, chunkY: number): Chunk | null {
    return this.chunks.get(createChunkKey(chunkX, chunkY)) ?? null;
  }

  /**
   * Checks if a chunk is currently loaded.
   */
  isLoaded(chunkX: number, chunkY: number): boolean {
    return this.chunks.has(createChunkKey(chunkX, chunkY));
  }

  /**
   * Returns all currently loaded chunks.
   */
  getLoadedChunks(): Chunk[] {
    return Array.from(this.chunks.values());
  }

  /**
   * Returns the number of loaded chunks.
   */
  get loadedCount(): number {
    return this.chunks.size;
  }

  /**
   * Unloads all chunks.
   */
  clear(): void {
    for (const chunk of this.chunks.values()) {
      this.events.emit('chunkUnloaded', {
        chunkX: chunk.x,
        chunkY: chunk.y,
      });
    }
    this.chunks.clear();
  }

  /**
   * Forces regeneration of a specific chunk.
   */
  regenerateChunk(chunkX: number, chunkY: number): void {
    const key = createChunkKey(chunkX, chunkY);
    this.chunks.delete(key);
    this.loadChunk(chunkX, chunkY);
  }
}
