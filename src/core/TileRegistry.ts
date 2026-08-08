import type { TileId, TileDefinition } from '../types/Tile';
import { EMPTY_TILE } from '../types/Tile';

/**
 * Registry for tile definitions.
 * 
 * Maps tile IDs to their properties (passability, name, etc.).
 * This allows chunks to store only tile IDs while the registry
 * provides the full definition when needed.
 * 
 * @example
 * ```typescript
 * const registry = new TileRegistry();
 * registry.register({ id: 1, name: 'wall', passable: false });
 * registry.register({ id: 2, name: 'floor', passable: true });
 * 
 * const isPassable = registry.isPassable(2); // true
 * ```
 */
export class TileRegistry {
  private tiles = new Map<TileId, TileDefinition>();

  constructor() {
    // Register the empty tile by default
    this.register(EMPTY_TILE);
  }

  /**
   * Registers a tile definition.
   * @param definition - Tile definition to register
   * @throws Error if a tile with the same ID is already registered
   */
  register(definition: TileDefinition): void {
    if (this.tiles.has(definition.id)) {
      throw new Error(`Tile with ID ${definition.id} is already registered`);
    }
    this.tiles.set(definition.id, { ...definition });
  }

  /**
   * Registers or updates a tile definition (upsert).
   * @param definition - Tile definition to register or update
   */
  registerOrUpdate(definition: TileDefinition): void {
    this.tiles.set(definition.id, { ...definition });
  }

  /**
   * Unregisters a tile definition.
   * @param id - Tile ID to unregister
   * @throws Error if trying to unregister the empty tile
   */
  unregister(id: TileId): void {
    if (id === 0) {
      throw new Error('Cannot unregister the empty tile (ID 0)');
    }
    this.tiles.delete(id);
  }

  /**
   * Gets a tile definition by ID.
   * @param id - Tile ID
   * @returns Tile definition, or undefined if not found
   */
  get(id: TileId): TileDefinition | undefined {
    return this.tiles.get(id);
  }

  /**
   * Gets a tile definition by ID, throwing if not found.
   * @param id - Tile ID
   * @returns Tile definition
   * @throws Error if tile is not registered
   */
  getOrThrow(id: TileId): TileDefinition {
    const def = this.tiles.get(id);
    if (!def) {
      throw new Error(`Tile with ID ${id} is not registered`);
    }
    return def;
  }

  /**
   * Checks if a tile ID is registered.
   */
  has(id: TileId): boolean {
    return this.tiles.has(id);
  }

  /**
   * Checks if a tile is passable.
   * Returns true for unregistered tiles (treats unknown as passable).
   */
  isPassable(id: TileId): boolean {
    const def = this.tiles.get(id);
    return def?.passable ?? true;
  }

  /**
   * Checks if a tile is opaque (blocks line of sight).
   * Returns false for unregistered tiles.
   */
  isOpaque(id: TileId): boolean {
    const def = this.tiles.get(id);
    return def?.opaque ?? false;
  }

  /**
   * Gets the name of a tile.
   * Returns 'unknown' for unregistered tiles.
   */
  getName(id: TileId): string {
    return this.tiles.get(id)?.name ?? 'unknown';
  }

  /**
   * Gets all registered tile definitions.
   */
  getAll(): TileDefinition[] {
    return Array.from(this.tiles.values());
  }

  /**
   * Gets all registered tile IDs.
   */
  getAllIds(): TileId[] {
    return Array.from(this.tiles.keys());
  }

  /**
   * Returns the number of registered tiles.
   */
  get size(): number {
    return this.tiles.size;
  }

  /**
   * Clears all registered tiles except the empty tile.
   */
  clear(): void {
    this.tiles.clear();
    this.register(EMPTY_TILE);
  }
}
