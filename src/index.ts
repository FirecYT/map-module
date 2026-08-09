/**
 * @firec/map-module
 * 
 * High-performance tile-based map engine with chunk loading, LOD rendering,
 * and procedural generation support.
 * 
 * @packageDocumentation
 */

// Core
export { World } from './core/World';
export type { WorldOptions } from './core/World';
export { Chunk as DefaultChunk, Uint16Chunk } from './core/ChunkImpl';
export { CoordinateUtils } from './core/CoordinateUtils';
export { TileRegistry } from './core/TileRegistry';
export { DefaultGeneratorRegistry } from './core/DefaultGeneratorRegistry';

// Types
export type {
  Point2D,
  Rectangle,
  WorldPoint,
  ChunkCoord,
  GridCoord,
  LocalTileCoord,
  WorldCoord,
  ChunkKey,
} from './types/Coordinates';
export { createChunkKey, parseChunkKey } from './types/Coordinates';

export type { TileId, TileDefinition } from './types/Tile';
export { EMPTY_TILE_ID, EMPTY_TILE } from './types/Tile';

export type { Chunk, ChunkOptions } from './types/Chunk';

export type { ChunkGenerator, GeneratorRegistry } from './types/Generator';

export type {
  TileVisual,
  TileVisualContext,
  TileVisualProvider,
  ChunkRenderer,
  LODConfig,
} from './types/Renderer';

export type { WorldConfig, WorldDimensions } from './types/Config';
export { DEFAULT_WORLD_CONFIG, computeDimensions } from './types/Config';

export type {
  ChunkLoadedEvent,
  ChunkUnloadedEvent,
  ChunkModifiedEvent,
  ChunksUpdatedEvent,
  WorldEvents,
} from './types/Events';

// Generation
export { BaseGenerator } from './generation/BaseGenerator';
export { EmptyGenerator, CheckerboardGenerator } from './generation/SimpleGenerators';
export { ValueNoise2D, createNoise2D } from './generation/noise/ValueNoise2D';

// Rendering
export { CanvasChunkRenderer } from './rendering/CanvasChunkRenderer';
export type { CanvasRendererConfig } from './rendering/CanvasChunkRenderer';
export { LODManager, DEFAULT_LOD_CONFIG } from './rendering/LODManager';
export { ChunkViewManager } from './rendering/ChunkViewManager';
export type { ChunkViewManagerConfig } from './rendering/ChunkViewManager';
export {
  createCanvas,
  getCanvasContext,
  canvasToImageBitmap,
  isOffscreenCanvas,
  isHTMLCanvasElement,
} from './rendering/CanvasFactory';
export type { CanvasType, CanvasFactory } from './rendering/CanvasFactory';

// Utilities
export { TypedEventBus } from './utils/EventBus';
export { SeededRandom, createSeedFromCoords } from './utils/SeededRandom';
export { LRUCache } from './utils/LRUCache';
