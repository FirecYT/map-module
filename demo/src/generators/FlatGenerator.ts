/**
 * FlatGenerator — простая плоская карта с травой.
 */
import { BaseGenerator, SeededRandom } from '@firec/map-module';
import type { Chunk, BuildContext } from '@firec/map-module';
import { BIOME_TILES } from './BiomeGenerator';

export class FlatGenerator extends BaseGenerator {
  readonly id = 'flat';

  protected buildChunk(chunk: Chunk, ctx: BuildContext): void {
    // Per-chunk seed for discrete scatter (trees, flowers, rocks)
    const rng = new SeededRandom(ctx.seed);

    for (let y = 0; y < chunk.size; y++) {
      for (let x = 0; x < chunk.size; x++) {
        chunk.setTile(x, y, BIOME_TILES.GRASS);

        // Scatter some features
        if (rng.chance(0.02)) {
          chunk.setTile(x, y, BIOME_TILES.TREE);
        } else if (rng.chance(0.01)) {
          chunk.setTile(x, y, BIOME_TILES.FLOWER);
        } else if (rng.chance(0.005)) {
          chunk.setTile(x, y, BIOME_TILES.ROCK);
        }
      }
    }
  }
}
