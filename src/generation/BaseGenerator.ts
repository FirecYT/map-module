import type { Chunk, ChunkOptions } from '../types/Chunk';
import type { ChunkGenerator } from '../types/Generator';
import { Chunk as ChunkImpl } from '../core/ChunkImpl';

/**
 * Context passed to buildChunk, containing both per-chunk and world-level data.
 *
 * ## The two-seed principle
 *
 * **`seed`** (per-chunk): derived from chunk coordinates + world seed.
 * Use it for *discrete* decisions that are local to this chunk:
 *   - Number of structures to place
 *   - Which decorations to spawn
 *   - Random loot table rolls
 *
 * **`worldSeed`**: the same for ALL chunks in the world.
 * Use it to seed noise functions (ValueNoise2D, etc.) and sample them with
 * **world coordinates** (`chunkX * size + localX`). This guarantees that
 * continuous fields (heightmap, biomes, temperature, moisture) are seamless
 * across chunk boundaries.
 *
 * @example
 * ```typescript
 * // CORRECT — continuous noise, seamless across chunks
 * const noise = new ValueNoise2D(ctx.worldSeed);
 * for (let ly = 0; ly < chunk.size; ly++) {
 *   for (let lx = 0; lx < chunk.size; lx++) {
 *     const wx = ctx.chunkX * chunk.size + lx;
 *     const wy = ctx.chunkY * chunk.size + ly;
 *     const height = noise.get(wx * 0.1, wy * 0.1);
 *     // ...
 *   }
 * }
 *
 * // CORRECT — discrete per-chunk randomness
 * const rng = new SeededRandom(ctx.seed);
 * const treeCount = rng.nextInt(0, 5);
 *
 * // WRONG — per-chunk seed for noise = visible seams at chunk borders
 * const noise = new ValueNoise2D(ctx.seed); // BAD!
 * ```
 */
export interface BuildContext {
  /** Per-chunk seed (unique for this chunk position) */
  readonly seed: number;
  /** World seed (same for all chunks — use for noise functions) */
  readonly worldSeed: number;
  /** Chunk X coordinate in the chunk grid */
  readonly chunkX: number;
  /** Chunk Y coordinate in the chunk grid */
  readonly chunkY: number;
  /** Chunk size in tiles (tiles per side) */
  readonly chunkSize: number;
}

/**
 * Abstract base class for chunk generators.
 *
 * Provides common utilities and a structured generation pipeline.
 * Extend this class to create custom generators.
 *
 * @example
 * ```typescript
 * class MyGenerator extends BaseGenerator {
 *   readonly id = 'my-generator';
 *
 *   protected buildChunk(chunk: Chunk, ctx: BuildContext): void {
 *     // Continuous noise — seamless across chunks
 *     const noise = new ValueNoise2D(ctx.worldSeed);
 *     for (let ly = 0; ly < chunk.size; ly++) {
 *       for (let lx = 0; lx < chunk.size; lx++) {
 *         const wx = ctx.chunkX * chunk.size + lx;
 *         const wy = ctx.chunkY * chunk.size + ly;
 *         const height = noise.get(wx * 0.1, wy * 0.1);
 *         chunk.setTile(lx, ly, height > 0.5 ? 1 : 2);
 *       }
 *     }
 *
 *     // Discrete per-chunk randomness
 *     const rng = new SeededRandom(ctx.seed);
 *     if (rng.chance(0.3)) {
 *       chunk.setTile(rng.nextInt(0, chunk.size), rng.nextInt(0, chunk.size), 3);
 *     }
 *   }
 * }
 * ```
 */
export abstract class BaseGenerator implements ChunkGenerator {
  abstract readonly id: string;

  /**
   * Generates a new chunk.
   * Creates a fresh chunk and calls buildChunk for population.
   */
  generate(options: ChunkOptions): Chunk {
    const chunk = new ChunkImpl(options);
    const ctx: BuildContext = {
      seed: options.seed,
      worldSeed: options.worldSeed,
      chunkX: options.x,
      chunkY: options.y,
      chunkSize: options.size,
    };
    this.buildChunk(chunk, ctx);
    return chunk;
  }

  /**
   * Override this method to implement your generation logic.
   * The chunk is already created and initialized to all zeros.
   *
   * @param chunk - The chunk to populate
   * @param ctx - Build context with seed, worldSeed, and coordinate info
   */
  protected abstract buildChunk(chunk: Chunk, ctx: BuildContext): void;

  // ============================================================================
  // Coordinate helpers
  // ============================================================================

  /**
   * Converts local tile coordinates to world tile coordinates.
   * Use these when sampling world-level noise to ensure seamless chunk borders.
   *
   * @param ctx - Build context
   * @param localX - Local X within the chunk (0..chunkSize-1)
   * @param localY - Local Y within the chunk (0..chunkSize-1)
   * @returns World tile coordinates { x, y }
   */
  protected localToWorld(
    ctx: BuildContext,
    localX: number,
    localY: number
  ): { x: number; y: number } {
    return {
      x: ctx.chunkX * ctx.chunkSize + localX,
      y: ctx.chunkY * ctx.chunkSize + localY,
    };
  }

  /**
   * Converts world tile coordinates back to local chunk coordinates.
   * Useful when you need to check which chunk a world position belongs to.
   */
  protected worldToLocal(
    ctx: BuildContext,
    worldX: number,
    worldY: number
  ): { chunkX: number; chunkY: number; localX: number; localY: number } {
    const chunkX = Math.floor(worldX / ctx.chunkSize);
    const chunkY = Math.floor(worldY / ctx.chunkSize);
    return {
      chunkX,
      chunkY,
      localX: ((worldX % ctx.chunkSize) + ctx.chunkSize) % ctx.chunkSize,
      localY: ((worldY % ctx.chunkSize) + ctx.chunkSize) % ctx.chunkSize,
    };
  }

  /**
   * Default priority implementation.
   * Override getPriority for dynamic priority based on position.
   */
  getPriority?(_chunkX: number, _chunkY: number): number;

  /**
   * Default canGenerate implementation.
   * Override to restrict where this generator can be used.
   */
  canGenerate?(_chunkX: number, _chunkY: number): boolean;
}
