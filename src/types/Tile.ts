/**
 * Tile ID is a numeric identifier for tile types.
 * 0 is reserved for "empty" or "air" tile.
 */
export type TileId = number;

/**
 * Represents a tile definition with its properties.
 * This is stored in the tile registry, not in chunks.
 */
export interface TileDefinition {
  /** Unique identifier */
  id: TileId;
  /** Human-readable name */
  name: string;
  /** Whether entities can walk through this tile */
  passable: boolean;
  /** Whether this tile blocks line of sight */
  opaque?: boolean;
  /** Arbitrary metadata for custom properties */
  metadata?: Record<string, unknown>;
}

/**
 * The empty/air tile constant.
 */
export const EMPTY_TILE_ID: TileId = 0;

/**
 * Default tile definition for empty/air tile.
 */
export const EMPTY_TILE: TileDefinition = {
  id: EMPTY_TILE_ID,
  name: 'empty',
  passable: true,
  opaque: false,
};
