/**
 * IslandGenerator — генератор островов.
 *
 * Использует радиальное затухание + шум для создания островов
 * в океане. Каждый чанк может быть частью острова или океаном.
 */
import { BaseGenerator, ValueNoise2D, SeededRandom } from '@firec/map-module';
import type { Chunk, BuildContext } from '@firec/map-module';
import { BIOME_TILES } from './BiomeGenerator';

export class IslandGenerator extends BaseGenerator {
  readonly id = 'islands';

  protected buildChunk(chunk: Chunk, ctx: BuildContext): void {
    // Noise uses worldSeed + world coordinates → seamless across chunk borders
    const noise = new ValueNoise2D(ctx.worldSeed);
    // Per-chunk seed for discrete decisions (decorations)
    const rng = new SeededRandom(ctx.seed);

    for (let y = 0; y < chunk.size; y++) {
      for (let x = 0; x < chunk.size; x++) {
        const { x: worldX, y: worldY } = this.localToWorld(ctx, x, y);

        // Island function: creates blobs of land
        const islandNoise = noise.octave(worldX * 0.008, worldY * 0.008, 4, 0.5, 2.0);

        // Add circular falloff based on distance from nearest "island center"
        // We simulate this by using a low-frequency noise as a mask
        const mask = noise.octave(worldX * 0.003 + 1000, worldY * 0.003 + 1000, 2, 0.5, 2.0);
        const islandValue = islandNoise * 0.6 + mask * 0.4;

        let tileId: number;

        if (islandValue < 0.38) {
          tileId = BIOME_TILES.DEEP_WATER;
        } else if (islandValue < 0.43) {
          tileId = BIOME_TILES.WATER;
        } else if (islandValue < 0.47) {
          tileId = BIOME_TILES.SAND;
        } else if (islandValue < 0.70) {
          tileId = BIOME_TILES.GRASS;
        } else if (islandValue < 0.82) {
          tileId = BIOME_TILES.FOREST;
        } else {
          tileId = BIOME_TILES.STONE;
        }

        chunk.setTile(x, y, tileId);
      }
    }

    // Decorations
    for (let y = 0; y < chunk.size; y++) {
      for (let x = 0; x < chunk.size; x++) {
        const current = chunk.getTile(x, y);

        if (current === BIOME_TILES.FOREST && rng.chance(0.4)) {
          chunk.setTile(x, y, BIOME_TILES.TREE);
        } else if (current === BIOME_TILES.GRASS && rng.chance(0.015)) {
          chunk.setTile(x, y, BIOME_TILES.TREE);
        } else if (current === BIOME_TILES.SAND && rng.chance(0.02)) {
          chunk.setTile(x, y, BIOME_TILES.ROCK);
        } else if (current === BIOME_TILES.GRASS && rng.chance(0.03)) {
          chunk.setTile(x, y, BIOME_TILES.FLOWER);
        }
      }
    }
  }
}
