import type { Chunk, ChunkOptions } from './Chunk';

/**
 * Interface for chunk generators.
 * 
 * Generators are responsible for procedurally creating chunk data.
 * They must be deterministic (same seed = same output) to support
 * multiplayer synchronization and consistent world generation.
 */
export interface ChunkGenerator {
  /** Unique identifier for this generator */
  readonly id: string;
  
  /**
   * Generates a new chunk with the given options.
   * Must be deterministic: same seed must produce identical output.
   * 
   * @param options - Chunk creation options including position and seed
   * @returns A fully generated chunk
   */
  generate(options: ChunkOptions): Chunk;
  
  /**
   * Optional: returns the priority of this generator for a given chunk position.
   * Higher priority generators are preferred when multiple generators match.
   * 
   * @param chunkX - X coordinate of the chunk
   * @param chunkY - Y coordinate of the chunk
   * @returns Priority value (higher = more preferred)
   */
  getPriority?(chunkX: number, chunkY: number): number;
  
  /**
   * Optional: checks if this generator should handle the given chunk.
   * 
   * @param chunkX - X coordinate of the chunk
   * @param chunkY - Y coordinate of the chunk
   * @returns true if this generator should handle the chunk
   */
  canGenerate?(chunkX: number, chunkY: number): boolean;
}

/**
 * Registry for chunk generators.
 * Allows registering multiple generators with different priorities.
 */
export interface GeneratorRegistry {
  /**
   * Registers a generator with optional priority.
   * @param generator - The generator to register
   * @param priority - Priority (higher = preferred)
   */
  register(generator: ChunkGenerator, priority?: number): void;
  
  /**
   * Unregisters a generator by ID.
   * @param id - Generator ID to unregister
   */
  unregister(id: string): void;
  
  /**
   * Gets the best generator for a given chunk position.
   * @param chunkX - X coordinate
   * @param chunkY - Y coordinate
   * @returns The best matching generator, or null if none match
   */
  getGenerator(chunkX: number, chunkY: number): ChunkGenerator | null;
}
