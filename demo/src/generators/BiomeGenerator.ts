/**
 * BiomeGenerator — генератор с биомами на основе многослойного шума.
 *
 * Биомы:
 *   0 = EMPTY (не используется)
 *   1 = DEEP_WATER
 *   2 = WATER
 *   3 = SAND
 *   4 = GRASS
 *   5 = FOREST
 *   6 = STONE
 *   7 = SNOW
 *
 * Дополнительные структуры (деревья, камни) добавляются после базового рельефа.
 */
import { BaseGenerator, ValueNoise2D, SeededRandom } from '@firec/map-module';
import type { Chunk, BuildContext } from '@firec/map-module';

export const BIOME_TILES = {
  EMPTY: 0,
  DEEP_WATER: 1,
  WATER: 2,
  SAND: 3,
  GRASS: 4,
  FOREST: 5,
  STONE: 6,
  SNOW: 7,
  TREE: 8,
  ROCK: 9,
  FLOWER: 10,
} as const;

export class BiomeGenerator extends BaseGenerator {
  readonly id = 'biomes';

  protected buildChunk(chunk: Chunk, ctx: BuildContext): void {
    // Noise uses worldSeed + world coordinates → seamless across chunk borders
    const heightNoise = new ValueNoise2D(ctx.worldSeed);
    const moistureNoise = new ValueNoise2D(ctx.worldSeed ^ 0xDEADBEEF);
    const detailNoise = new ValueNoise2D(ctx.worldSeed ^ 0xCAFEBABE);
    // Per-chunk seed for discrete decisions (decorations)
    const rng = new SeededRandom(ctx.seed);

    for (let y = 0; y < chunk.size; y++) {
      for (let x = 0; x < chunk.size; x++) {
        const { x: worldX, y: worldY } = this.localToWorld(ctx, x, y);

        // Height: multi-octave noise for natural terrain
        const height = heightNoise.octave(worldX * 0.02, worldY * 0.02, 5, 0.5, 2.0);

        // Moisture: different frequency for variety
        const moisture = moistureNoise.octave(worldX * 0.015, worldY * 0.015, 3, 0.6, 2.0);

        // Detail: small-scale variation
        const detail = detailNoise.get(worldX * 0.1, worldY * 0.1);

        let tileId: number;

        if (height < 0.30) {
          tileId = BIOME_TILES.DEEP_WATER;
        } else if (height < 0.38) {
          tileId = BIOME_TILES.WATER;
        } else if (height < 0.42) {
          tileId = BIOME_TILES.SAND;
        } else if (height < 0.65) {
          // Lowland biomes depend on moisture
          if (moisture < 0.35) {
            tileId = BIOME_TILES.SAND; // Desert-ish
          } else if (moisture < 0.60) {
            tileId = BIOME_TILES.GRASS;
          } else {
            tileId = BIOME_TILES.FOREST;
          }
        } else if (height < 0.80) {
          tileId = BIOME_TILES.STONE;
        } else {
          tileId = BIOME_TILES.SNOW;
        }

        // Add small details on passable terrain
        if (tileId === BIOME_TILES.GRASS && detail > 0.85 && rng.chance(0.3)) {
          tileId = BIOME_TILES.FLOWER;
        }

        chunk.setTile(x, y, tileId);
      }
    }

    // Second pass: scatter trees and rocks
    for (let y = 0; y < chunk.size; y++) {
      for (let x = 0; x < chunk.size; x++) {
        const current = chunk.getTile(x, y);

        if (current === BIOME_TILES.FOREST && rng.chance(0.35)) {
          chunk.setTile(x, y, BIOME_TILES.TREE);
        } else if (current === BIOME_TILES.GRASS && rng.chance(0.02)) {
          chunk.setTile(x, y, BIOME_TILES.TREE);
        } else if (current === BIOME_TILES.STONE && rng.chance(0.08)) {
          chunk.setTile(x, y, BIOME_TILES.ROCK);
        } else if (current === BIOME_TILES.SAND && rng.chance(0.01)) {
          chunk.setTile(x, y, BIOME_TILES.ROCK);
        }
      }
    }
  }
}
