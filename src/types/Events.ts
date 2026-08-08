import type { Chunk } from './Chunk';
import type { ChunkCoord } from './Coordinates';

/**
 * Event emitted when a chunk is loaded.
 */
export interface ChunkLoadedEvent {
  chunk: Chunk;
  chunkX: number;
  chunkY: number;
}

/**
 * Event emitted when a chunk is unloaded.
 */
export interface ChunkUnloadedEvent {
  chunkX: number;
  chunkY: number;
}

/**
 * Event emitted when a chunk is modified.
 */
export interface ChunkModifiedEvent {
  chunk: Chunk;
  chunkX: number;
  chunkY: number;
  /** Local coordinates of the modification, if applicable */
  localX?: number;
  localY?: number;
}

/**
 * Event emitted when chunks are updated around a position.
 */
export interface ChunksUpdatedEvent {
  centerX: number;
  centerY: number;
  loadedChunks: ChunkCoord[];
  unloadedChunks: ChunkCoord[];
}

/**
 * Map of all world events.
 * 
 * Note: Defined as a `type` rather than an `interface` because TypeScript
 * interfaces do not satisfy `Record<string, unknown>` constraints (they lack
 * implicit index signatures). Type aliases work correctly with generic constraints.
 */
export type WorldEvents = {
  chunkLoaded: ChunkLoadedEvent;
  chunkUnloaded: ChunkUnloadedEvent;
  chunkModified: ChunkModifiedEvent;
  chunksUpdated: ChunksUpdatedEvent;
};
