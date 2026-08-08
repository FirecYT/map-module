import { describe, it, expect } from 'vitest';
import { Chunk } from '../src/core/ChunkImpl';
import { TileRegistry } from '../src/core/TileRegistry';
import { CoordinateUtils } from '../src/core/CoordinateUtils';
import { SeededRandom, createSeedFromCoords } from '../src/utils/SeededRandom';
import { TypedEventBus } from '../src/utils/EventBus';
import { LRUCache } from '../src/utils/LRUCache';
import { World } from '../src/core/World';
import { EmptyGenerator } from '../src/generation/SimpleGenerators';
import { DEFAULT_WORLD_CONFIG } from '../src/types/Config';

describe('Chunk', () => {
  it('should create a chunk with correct size', () => {
    const chunk = new Chunk({ x: 0, y: 0, size: 16, seed: 0 });
    expect(chunk.size).toBe(16);
    expect(chunk.x).toBe(0);
    expect(chunk.y).toBe(0);
  });

  it('should get and set tiles correctly', () => {
    const chunk = new Chunk({ x: 0, y: 0, size: 4, seed: 0 });
    chunk.setTile(1, 2, 5);
    expect(chunk.getTile(1, 2)).toBe(5);
  });

  it('should return 0 for out-of-bounds tiles', () => {
    const chunk = new Chunk({ x: 0, y: 0, size: 4, seed: 0 });
    expect(chunk.getTile(-1, 0)).toBe(0);
    expect(chunk.getTile(0, 4)).toBe(0);
  });

  it('should fill rectangles correctly', () => {
    const chunk = new Chunk({ x: 0, y: 0, size: 4, seed: 0 });
    chunk.fillRect(1, 1, 2, 2, 7);
    expect(chunk.getTile(1, 1)).toBe(7);
    expect(chunk.getTile(2, 2)).toBe(7);
    expect(chunk.getTile(0, 0)).toBe(0);
  });

  it('should increment generation on modification', () => {
    const chunk = new Chunk({ x: 0, y: 0, size: 4, seed: 0 });
    expect(chunk.generation).toBe(0);
    chunk.setTile(0, 0, 1);
    expect(chunk.generation).toBe(1);
    chunk.setTile(0, 0, 2);
    expect(chunk.generation).toBe(2);
  });
});

describe('TileRegistry', () => {
  it('should register and retrieve tiles', () => {
    const registry = new TileRegistry();
    registry.register({ id: 1, name: 'wall', passable: false });
    expect(registry.get(1)).toBeDefined();
    expect(registry.get(1)?.name).toBe('wall');
  });

  it('should check passability correctly', () => {
    const registry = new TileRegistry();
    registry.register({ id: 1, name: 'wall', passable: false });
    registry.register({ id: 2, name: 'floor', passable: true });
    
    expect(registry.isPassable(1)).toBe(false);
    expect(registry.isPassable(2)).toBe(true);
  });

  it('should throw on duplicate registration', () => {
    const registry = new TileRegistry();
    registry.register({ id: 1, name: 'wall', passable: false });
    expect(() => {
      registry.register({ id: 1, name: 'wall2', passable: false });
    }).toThrow();
  });
});

describe('CoordinateUtils', () => {
  const utils = new CoordinateUtils(DEFAULT_WORLD_CONFIG);

  it('should convert world to chunk coordinates', () => {
    const coord = utils.worldToChunk(512, 1024);
    expect(coord.chunkX).toBe(1); // 512 / 512 = 1
    expect(coord.chunkY).toBe(2); // 1024 / 512 = 2
  });

  it('should convert world to grid coordinates', () => {
    const coord = utils.worldToGrid(48, 64);
    expect(coord.chunkX).toBe(0);
    expect(coord.chunkY).toBe(0);
    expect(coord.localX).toBe(1); // 48 / 32 = 1
    expect(coord.localY).toBe(2); // 64 / 32 = 2
  });

  it('should convert chunk to world coordinates', () => {
    const point = utils.chunkToWorld(2, 3);
    expect(point.x).toBe(2 * 16 * 32);
    expect(point.y).toBe(3 * 16 * 32);
  });
});

describe('SeededRandom', () => {
  it('should produce deterministic sequences', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(42);
    
    expect(rng1.next()).toBe(rng2.next());
    expect(rng1.next()).toBe(rng2.next());
    expect(rng1.next()).toBe(rng2.next());
  });

  it('should produce different sequences for different seeds', () => {
    const rng1 = new SeededRandom(1);
    const rng2 = new SeededRandom(2);
    
    expect(rng1.next()).not.toBe(rng2.next());
  });

  it('should generate integers in range', () => {
    const rng = new SeededRandom(42);
    for (let i = 0; i < 100; i++) {
      const value = rng.nextInt(5, 10);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThan(10);
    }
  });

  it('should create deterministic seeds from coordinates', () => {
    const seed1 = createSeedFromCoords(10, 20, 0);
    const seed2 = createSeedFromCoords(10, 20, 0);
    const seed3 = createSeedFromCoords(20, 10, 0);
    
    expect(seed1).toBe(seed2);
    expect(seed1).not.toBe(seed3);
  });
});

describe('TypedEventBus', () => {
  it('should emit and receive events', () => {
    const bus = new TypedEventBus<{ test: number }>();
    let received = 0;
    
    bus.on('test', (data) => {
      received = data;
    });
    
    bus.emit('test', 42);
    expect(received).toBe(42);
  });

  it('should unsubscribe correctly', () => {
    const bus = new TypedEventBus<{ test: number }>();
    let count = 0;
    
    const unsubscribe = bus.on('test', () => {
      count++;
    });
    
    bus.emit('test', 1);
    expect(count).toBe(1);
    
    unsubscribe();
    bus.emit('test', 2);
    expect(count).toBe(1);
  });

  it('should support once', () => {
    const bus = new TypedEventBus<{ test: number }>();
    let count = 0;
    
    bus.once('test', () => {
      count++;
    });
    
    bus.emit('test', 1);
    bus.emit('test', 2);
    expect(count).toBe(1);
  });
});

describe('LRUCache', () => {
  it('should store and retrieve values', () => {
    const cache = new LRUCache<string, number>(10);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('should evict LRU items when full', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // Should evict 'a'
    
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
  });

  it('should update LRU order on access', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    
    cache.get('a'); // Access 'a', making it most recently used
    cache.set('d', 4); // Should evict 'b' (least recently used)
    
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
  });
});

describe('World', () => {
  it('should create a world with default config', () => {
    const world = new World();
    expect(world.config).toBeDefined();
    expect(world.tiles).toBeDefined();
  });

  it('should register and retrieve tiles', () => {
    const world = new World();
    world.registerTile({ id: 1, name: 'wall', passable: false });
    expect(world.tiles.get(1)).toBeDefined();
  });

  it('should register generators', () => {
    const world = new World();
    world.registerGenerator(new EmptyGenerator());
    // No error thrown means success
  });

  it('should load chunks on update', () => {
    const world = new World();
    world.registerGenerator(new EmptyGenerator());
    
    expect(world.getLoadedChunks().length).toBe(0);
    world.update(0, 0);
    expect(world.getLoadedChunks().length).toBeGreaterThan(0);
  });

  it('should query tiles correctly', () => {
    const world = new World({
      config: { chunkSize: 4, tileSize: 32, loadRadius: 1, unloadBuffer: 1 },
    });
    world.registerGenerator(new EmptyGenerator());
    world.update(0, 0);
    
    // Empty generator fills with tile 0
    const tileId = world.getTileAt(16, 16); // Middle of first tile
    expect(tileId).toBe(0);
  });
});
