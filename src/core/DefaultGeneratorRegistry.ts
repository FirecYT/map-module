import type { ChunkGenerator, GeneratorRegistry } from '../types/Generator';

/**
 * Internal entry for a registered generator with priority.
 */
interface GeneratorEntry {
  generator: ChunkGenerator;
  priority: number;
}

/**
 * Default implementation of the generator registry.
 * 
 * Manages multiple chunk generators and selects the best one
 * based on priority and optional canGenerate checks.
 * 
 * @example
 * ```typescript
 * const registry = new DefaultGeneratorRegistry();
 * 
 * // Register with default priority (0)
 * registry.register(new PlainsGenerator());
 * 
 * // Register with higher priority
 * registry.register(new BossArenaGenerator(), 100);
 * 
 * // Get best generator for a chunk
 * const gen = registry.getGenerator(5, 10);
 * ```
 */
export class DefaultGeneratorRegistry implements GeneratorRegistry {
  private generators = new Map<string, GeneratorEntry>();

  /**
   * Registers a generator with optional priority.
   * Higher priority generators are preferred when multiple match.
   */
  register(generator: ChunkGenerator, priority: number = 0): void {
    this.generators.set(generator.id, { generator, priority });
  }

  /**
   * Unregisters a generator by ID.
   */
  unregister(id: string): void {
    this.generators.delete(id);
  }

  /**
   * Gets the best generator for a given chunk position.
   * 
   * Selection order:
   * 1. Generators with canGenerate() returning true are preferred
   * 2. Among matching generators, highest priority wins
   * 3. If no canGenerate() is defined, generator is always eligible
   */
  getGenerator(chunkX: number, chunkY: number): ChunkGenerator | null {
    let bestGenerator: ChunkGenerator | null = null;
    let bestPriority = -Infinity;

    for (const entry of this.generators.values()) {
      const { generator, priority } = entry;
      
      // Check if generator can handle this chunk
      if (generator.canGenerate && !generator.canGenerate(chunkX, chunkY)) {
        continue;
      }

      // Calculate effective priority
      let effectivePriority = priority;
      if (generator.getPriority) {
        effectivePriority += generator.getPriority(chunkX, chunkY);
      }

      if (effectivePriority > bestPriority) {
        bestPriority = effectivePriority;
        bestGenerator = generator;
      }
    }

    return bestGenerator;
  }

  /**
   * Returns all registered generators.
   */
  getAll(): ChunkGenerator[] {
    return Array.from(this.generators.values()).map(e => e.generator);
  }

  /**
   * Returns the number of registered generators.
   */
  get size(): number {
    return this.generators.size;
  }

  /**
   * Clears all registered generators.
   */
  clear(): void {
    this.generators.clear();
  }
}
