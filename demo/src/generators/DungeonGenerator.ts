/**
 * DungeonGenerator — процедурное подземелье.
 *
 * Генерирует комнаты, соединённые коридорами, со стенами и полом.
 */
import { BaseGenerator, SeededRandom } from '@firec/map-module';
import type { Chunk } from '@firec/map-module';

// Use IDs that don't conflict with BIOME_TILES (which go up to 10)
const DUNGEON_TILES = {
  EMPTY: 0,
  WALL: 11,
  FLOOR: 12,
  DOOR: 13,
  TORCH: 14,
  PILLAR: 15,
} as const;

export { DUNGEON_TILES };

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  centerX: number;
  centerY: number;
}

export class DungeonGenerator extends BaseGenerator {
  readonly id = 'dungeon';

  protected buildChunk(chunk: Chunk, seed: number): void {
    const rng = new SeededRandom(seed);

    // Start with all walls
    chunk.fill(DUNGEON_TILES.WALL);

    // Generate rooms
    const rooms: Room[] = [];
    const maxRooms = rng.nextInt(3, 6);
    const minSize = 3;
    const maxSize = Math.min(7, chunk.size - 2);

    for (let attempt = 0; attempt < maxRooms * 20 && rooms.length < maxRooms; attempt++) {
      const w = rng.nextInt(minSize, maxSize + 1);
      const h = rng.nextInt(minSize, maxSize + 1);
      const x = rng.nextInt(1, chunk.size - w - 1);
      const y = rng.nextInt(1, chunk.size - h - 1);

      // Check overlap with existing rooms (with padding)
      let overlaps = false;
      for (const room of rooms) {
        if (
          x < room.x + room.w + 1 &&
          x + w + 1 > room.x &&
          y < room.y + room.h + 1 &&
          y + h + 1 > room.y
        ) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        rooms.push({
          x, y, w, h,
          centerX: x + Math.floor(w / 2),
          centerY: y + Math.floor(h / 2),
        });
      }
    }

    // Carve rooms
    for (const room of rooms) {
      for (let ry = room.y; ry < room.y + room.h; ry++) {
        for (let rx = room.x; rx < room.x + room.w; rx++) {
          chunk.setTile(rx, ry, DUNGEON_TILES.FLOOR);
        }
      }
    }

    // Connect rooms with corridors
    for (let i = 0; i < rooms.length - 1; i++) {
      const a = rooms[i];
      const b = rooms[i + 1];

      // L-shaped corridor
      let cx = a.centerX;
      let cy = a.centerY;

      // Horizontal first
      while (cx !== b.centerX) {
        chunk.setTile(cx, cy, DUNGEON_TILES.FLOOR);
        // Widen corridor
        if (cy > 0) chunk.setTile(cx, cy - 1, DUNGEON_TILES.FLOOR);
        if (cy < chunk.size - 1) chunk.setTile(cx, cy + 1, DUNGEON_TILES.FLOOR);
        cx += cx < b.centerX ? 1 : -1;
      }

      // Then vertical
      while (cy !== b.centerY) {
        chunk.setTile(cx, cy, DUNGEON_TILES.FLOOR);
        if (cx > 0) chunk.setTile(cx - 1, cy, DUNGEON_TILES.FLOOR);
        if (cx < chunk.size - 1) chunk.setTile(cx + 1, cy, DUNGEON_TILES.FLOOR);
        cy += cy < b.centerY ? 1 : -1;
      }
    }

    // Add pillars in large rooms
    for (const room of rooms) {
      if (room.w >= 5 && room.h >= 5) {
        const px1 = room.x + 1;
        const px2 = room.x + room.w - 2;
        const py1 = room.y + 1;
        const py2 = room.y + room.h - 2;

        if (rng.chance(0.6)) {
          chunk.setTile(px1, py1, DUNGEON_TILES.PILLAR);
          chunk.setTile(px2, py1, DUNGEON_TILES.PILLAR);
          chunk.setTile(px1, py2, DUNGEON_TILES.PILLAR);
          chunk.setTile(px2, py2, DUNGEON_TILES.PILLAR);
        }
      }
    }

    // Add torches near walls
    for (let y = 1; y < chunk.size - 1; y++) {
      for (let x = 1; x < chunk.size - 1; x++) {
        if (chunk.getTile(x, y) !== DUNGEON_TILES.FLOOR) continue;

        // Check if adjacent to wall
        const adjWall =
          chunk.getTile(x - 1, y) === DUNGEON_TILES.WALL ||
          chunk.getTile(x + 1, y) === DUNGEON_TILES.WALL ||
          chunk.getTile(x, y - 1) === DUNGEON_TILES.WALL ||
          chunk.getTile(x, y + 1) === DUNGEON_TILES.WALL;

        if (adjWall && rng.chance(0.04)) {
          chunk.setTile(x, y, DUNGEON_TILES.TORCH);
        }
      }
    }
  }
}
