import type { Chunk, ChunkOptions } from '../types/Chunk';
import type { ChunkGenerator } from '../types/Generator';
import { Chunk as ChunkImpl } from '../core/ChunkImpl';

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
 *   protected buildChunk(chunk: Chunk, seed: number): void {
 *     // Your generation logic here
 *     chunk.fill(2); // Fill with tile ID 2
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
    this.buildChunk(chunk, options.seed);
    return chunk;
  }

  /**
   * Override this method to implement your generation logic.
   * The chunk is already created and initialized to all zeros.
   * 
   * @param chunk - The chunk to populate
   * @param seed - Deterministic seed for this chunk
   */
  protected abstract buildChunk(chunk: Chunk, seed: number): void;

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
