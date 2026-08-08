import type { Chunk } from '../types/Chunk';
import { BaseGenerator } from './BaseGenerator';

/**
 * Generator that creates empty (all passable) chunks.
 * Useful as a fallback or for testing.
 */
export class EmptyGenerator extends BaseGenerator {
  readonly id = 'empty';

  protected buildChunk(chunk: Chunk, _seed: number): void {
    // Fill with tile 0 (empty) - already the default, but explicit
    chunk.fill(0);
  }
}

/**
 * Generator that creates a simple checkerboard pattern.
 * Useful for debugging coordinate systems.
 */
export class CheckerboardGenerator extends BaseGenerator {
  readonly id = 'checkerboard';
  
  private readonly tileA: number;
  private readonly tileB: number;

  constructor(tileA: number = 1, tileB: number = 2) {
    super();
    this.tileA = tileA;
    this.tileB = tileB;
  }

  protected buildChunk(chunk: Chunk, _seed: number): void {
    for (let y = 0; y < chunk.size; y++) {
      for (let x = 0; x < chunk.size; x++) {
        const isEven = (x + y) % 2 === 0;
        chunk.setTile(x, y, isEven ? this.tileA : this.tileB);
      }
    }
  }
}
