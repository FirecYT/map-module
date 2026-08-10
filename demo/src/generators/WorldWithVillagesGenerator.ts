import { BaseGenerator, ValueNoise2D, createSeedFromCoords, SeededRandom } from '@firec/map-module';
import type { Chunk, BuildContext } from '@firec/map-module';
import { BIOME_TILES } from './BiomeGenerator';

export class WorldWithVillagesGenerator extends BaseGenerator {
    readonly id = 'world-with-villages';

    // Размер деревни в чанках (3×3 чанка)
    private readonly villageSize = 3;
    // Плотность: ~3% суперчанков будут с деревней
    private readonly density = 0.3;

    protected buildChunk(chunk: Chunk, ctx: BuildContext): void {
        const size = chunk.size;

        // ---- 1. Базовый ландшафт (шум) ----
        // Noise uses worldSeed + world coordinates → seamless across chunk borders
        const noise = new ValueNoise2D(ctx.worldSeed);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const { x: worldX, y: worldY } = this.localToWorld(ctx, x, y);
                const height = noise.octave(worldX * 0.05, worldY * 0.05, 4);
                if (height < 0.3) chunk.setTile(x, y, BIOME_TILES.WATER);
                else if (height < 0.6) chunk.setTile(x, y, BIOME_TILES.GRASS);
                else chunk.setTile(x, y, BIOME_TILES.STONE);
            }
        }

        // ---- 2. Определяем, принадлежит ли чанк деревне ----
        const superX = Math.floor(ctx.chunkX / this.villageSize);
        const superY = Math.floor(ctx.chunkY / this.villageSize);
        const superSeed = createSeedFromCoords(superX, superY, 0xDEADBEEF);
        const rng = new SeededRandom(superSeed);
        const next = rng.next();
        const hasVillage = next < this.density;

        if (!hasVillage) return; // не деревня – оставляем только ландшафт

        // Локальные координаты внутри суперчанка (0..villageSize-1)
        const localCX = ((ctx.chunkX % this.villageSize) + this.villageSize) % this.villageSize;
        const localCY = ((ctx.chunkY % this.villageSize) + this.villageSize) % this.villageSize;
        const center = Math.floor(this.villageSize / 2);

        // ---- 3. Рисуем структуры поверх ландшафта ----

        // Центральная площадь (только в центральном чанке)
        if (localCX === center && localCY === center) {
            chunk.fillRect(4, 4, 8, 8, BIOME_TILES.STONE);
            chunk.fillRect(1, 1, 3, 3, BIOME_TILES.ROCK);
            chunk.fillRect(12, 1, 3, 3, BIOME_TILES.ROCK);
            chunk.fillRect(1, 12, 3, 3, BIOME_TILES.ROCK);
            chunk.fillRect(12, 12, 3, 3, BIOME_TILES.ROCK);
        }

        if (localCX === center || localCY === center) {
            for (let i = 0; i < size; i++) {
                if (localCX === center) chunk.setTile(Math.floor(size/2), i, BIOME_TILES.STONE);
                if (localCY === center) chunk.setTile(i, Math.floor(size/2), BIOME_TILES.STONE);
            }
        }

        // ---- 4. Заборы по внешним границам деревни ----
        // Проверяем, есть ли деревня в соседнем суперчанке
        const hasNeighborVillage = (dx: number, dy: number): boolean => {
            const nx = superX + dx;
            const ny = superY + dy;
            const nseed = createSeedFromCoords(nx, ny, 0xDEADBEEF);
            const rng2 = new SeededRandom(nseed);
            return rng2.next() < this.density;
        };

        // Левая граница
        if (localCX === 0 && !hasNeighborVillage(-1, 0)) {
            for (let y = 0; y < size; y++) chunk.setTile(0, y, BIOME_TILES.FLOWER);
        }
        // Правая
        if (localCX === this.villageSize - 1 && !hasNeighborVillage(1, 0)) {
            for (let y = 0; y < size; y++) chunk.setTile(size - 1, y, BIOME_TILES.FLOWER);
        }
        // Верхняя
        if (localCY === 0 && !hasNeighborVillage(0, -1)) {
            for (let x = 0; x < size; x++) chunk.setTile(x, 0, BIOME_TILES.FLOWER);
        }
        // Нижняя
        if (localCY === this.villageSize - 1 && !hasNeighborVillage(0, 1)) {
            for (let x = 0; x < size; x++) chunk.setTile(x, size - 1, BIOME_TILES.FLOWER);
        }
    }
}