# @firec/map-module

Высокопроизводительный, фреймворк-независимый движок тайловых карт с загрузкой чанков, рендерингом LOD и поддержкой процедурной генерации.

## Особенности

- **Управление миром на основе чанков** — Автоматическая загрузка/выгрузка чанков в зависимости от позиции игрока
- **Процедурная генерация** — Детерминированные генераторы чанков с поддержкой seed
- **Уровень детализации (LOD)** — Автоматическое снижение детализации для удалённых чанков
- **Кэширование через Offscreen Canvas** — Эффективный рендеринг с автоматической инвалидацией кэша
- **Реестр тайлов** — Централизованное управление определениями тайлов с пользовательскими свойствами
- **Утилиты системы координат** — Простое преобразование между мировыми, чанковыми и тайловыми координатами
- **Система событий** — Типизированные события для управления жизненным циклом чанков
- **Ноль зависимостей** — Чистый TypeScript, работает в любой среде с поддержкой Canvas 2D
- **Независимость от фреймворка** — Используйте с любым игровым движком или фреймворком

## Установка

```bash
npm install @firec/map-module
```

## Быстрый старт

```typescript
import { World, BaseGenerator, CanvasChunkRenderer, ChunkViewManager } from '@firec/map-module';

// 1. Создаём мир
const world = new World({
  config: {
    chunkSize: 16,    // 16x16 тайлов на чанк
    tileSize: 32,     // 32x32 пикселей на тайл
    loadRadius: 3,    // Загружать 3 чанка в каждом направлении
    unloadBuffer: 2,  // Выгружать чанки на расстоянии 2 чанков за радиусом загрузки
  },
  baseSeed: 12345,    // Базовый seed для детерминированной генерации
});

// 2. Регистрируем типы тайлов
world.registerTile({ id: 0, name: 'empty', passable: true });
world.registerTile({ id: 1, name: 'wall', passable: false, opaque: true });
world.registerTile({ id: 2, name: 'floor', passable: true });

// 3. Создаём и регистрируем генератор
class MyGenerator extends BaseGenerator {
  readonly id = 'my-generator';
  
  protected buildChunk(chunk: Chunk, seed: number): void {
    // Ваша логика генерации здесь
    chunk.fill(2); // Заполняем тайлами пола
  }
}

world.registerGenerator(new MyGenerator());

// 4. Настраиваем рендеринг
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const renderer = new CanvasChunkRenderer({
  tiles: world.tiles,
  worldConfig: world.config,
  visuals: new Map([
    [1, { color: '#666' }],  // Цвет стены
    [2, { color: '#999' }],  // Цвет пола
  ]),
});

const viewManager = new ChunkViewManager({
  worldConfig: world.config,
  renderer,
});

// 5. Игровой цикл
function update(playerX: number, playerY: number) {
  // Обновляем чанки вокруг игрока
  world.update(playerX, playerY);
}

function render(cameraX: number, cameraY: number, scale: number) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  viewManager.render(
    world.getLoadedChunks(),
    ctx,
    cameraX,
    cameraY,
    canvas.width,
    canvas.height,
    scale
  );
}
```

## Основные концепции

### Мир (World)

Класс `World` является основной точкой входа. Он управляет:
- Загрузкой/выгрузкой чанков
- Регистрацией тайлов
- Регистрацией генераторов
- Преобразованием координат
- Запросами тайлов

### Чанки (Chunks)

Чанки — это квадратные секции мира (по умолчанию 16x16 тайлов). Они:
- Загружаются автоматически, когда находятся в пределах `loadRadius` от центра обновления
- Выгружаются, когда выходят за пределы `loadRadius + unloadBuffer`
- Идентифицируются по координатам чанка (не мировым координатам)

### Тайлы (Tiles)

Тайлы идентифицируются числовыми ID (0-255 для `Chunk`, 0-65535 для `Uint16Chunk`).
Определения тайлов хранятся в `TileRegistry` и включают:
- `passable` — Могут ли сущности проходить сквозь тайл
- `opaque` — Блокирует ли тайл линию видимости
- `metadata` — Пользовательские свойства

### Генераторы (Generators)

Генераторы создают данные чанков процедурно. Они должны быть детерминированными
(одинаковый seed = одинаковый результат) для синхронизации в мультиплеере.

### Рендеринг (Rendering)

Рендерер использует offscreen canvas для кэширования и поддерживает:
- Несколько уровней LOD в зависимости от масштаба камеры
- Автоматическую инвалидацию кэша при изменении чанков
- Спрайт-листы и цветовые фолбэки
- Пользовательские визуальные провайдеры для каждого тайла

## Справочник API

### World

```typescript
class World {
  constructor(options?: WorldOptions);
  
  // Управление чанками
  update(worldX: number, worldY: number): void;
  getChunk(chunkX: number, chunkY: number): Chunk | null;
  getLoadedChunks(): Chunk[];
  isChunkLoaded(chunkX: number, chunkY: number): boolean;
  regenerateChunk(chunkX: number, chunkY: number): void;
  
  // Регистрация
  registerGenerator(generator: ChunkGenerator, priority?: number): void;
  registerTile(definition: TileDefinition): void;
  
  // Запросы тайлов
  getTileAt(worldX: number, worldY: number): TileId;
  setTileAt(worldX: number, worldY: number, tileId: TileId): boolean;
  isPassable(worldX: number, worldY: number): boolean;
  isOpaque(worldX: number, worldY: number): boolean;
  
  // Помощники для поиска пути
  hasLineOfSight(startX: number, startY: number, endX: number, endY: number): boolean;
  getPassableNeighbors(tileX: number, tileY: number): Array<{ x: number; y: number }>;
  
  // Преобразование координат
  worldToGrid(worldX: number, worldY: number): WorldCoord;
  worldToChunk(worldX: number, worldY: number): ChunkCoord;
  tileToWorld(tileX: number, tileY: number): WorldPoint;
  
  // Жизненный цикл
  dispose(): void;
}
```

### ChunkGenerator

```typescript
interface ChunkGenerator {
  readonly id: string;
  generate(options: ChunkOptions): Chunk;
  getPriority?(chunkX: number, chunkY: number): number;
  canGenerate?(chunkX: number, chunkY: number): boolean;
}
```

### TileDefinition

```typescript
interface TileDefinition {
  id: TileId;
  name: string;
  passable: boolean;
  opaque?: boolean;
  metadata?: Record<string, unknown>;
}
```

### CanvasChunkRenderer

```typescript
class CanvasChunkRenderer {
  constructor(config: CanvasRendererConfig);
  
  render(
    chunk: Chunk,
    ctx: CanvasRenderingContext2D,
    destX: number,
    destY: number,
    scale?: number,
    lod?: number
  ): void;
  
  setVisual(tileId: TileId, visual: TileVisualProvider): void;
  removeVisual(tileId: TileId): void;
  clearCache(): void;
  dispose(): void;
}
```

### TileVisual

```typescript
interface TileVisual {
  sprite?: CanvasImageSource;
  color?: string;
  spriteRect?: { x: number; y: number; width: number; height: number };
  flipX?: boolean;
  flipY?: boolean;
  rotation?: number;
  scale?: number;
}

// Или функция для динамических визуалов:
type TileVisualProvider = TileVisual | ((context: TileVisualContext) => TileVisual | null);
```

## Продвинутое использование

### Пользовательский генератор с шумом

```typescript
import { BaseGenerator, ValueNoise2D, SeededRandom } from '@firec/map-module';

class TerrainGenerator extends BaseGenerator {
  readonly id = 'terrain';
  
  protected buildChunk(chunk: Chunk, seed: number): void {
    const noise = new ValueNoise2D(seed);
    const rng = new SeededRandom(seed);
    
    for (let y = 0; y < chunk.size; y++) {
      for (let x = 0; x < chunk.size; x++) {
        const worldX = chunk.x * chunk.size + x;
        const worldY = chunk.y * chunk.size + y;
        
        // Многослойный шум для естественного ландшафта
        const height = noise.octave(worldX * 0.05, worldY * 0.05, 4);
        
        if (height < 0.3) {
          chunk.setTile(x, y, TILES.WATER);
        } else if (height < 0.6) {
          chunk.setTile(x, y, TILES.GRASS);
        } else {
          chunk.setTile(x, y, TILES.MOUNTAIN);
        }
      }
    }
  }
}
```

### Спрайт-листы

```typescript
const floorImage = new Image();
floorImage.src = 'sprites.png';

const renderer = new CanvasChunkRenderer({
  tiles: world.tiles,
  worldConfig: world.config,
  visuals: new Map([
    [1, {
      sprite: floorImage,
      spriteRect: { x: 0, y: 0, width: 32, height: 32 }
    }],
    [2, {
      sprite: floorImage,
      spriteRect: { x: 32, y: 0, width: 32, height: 32 }
    }],
  ]),
});
```

### Динамические визуалы

```typescript
// Визуал, который меняется в зависимости от соседних тайлов
renderer.setVisual(TILES.WALL, (context) => {
  const { chunk, localX, localY } = context;
  
  // Проверяем, есть ли у стены соседи
  const hasTop = localY > 0 && chunk.getTile(localX, localY - 1) === TILES.WALL;
  const hasBottom = localY < chunk.size - 1 && chunk.getTile(localX, localY + 1) === TILES.WALL;
  
  return {
    sprite: wallSpriteSheet,
    spriteRect: getWallSpriteRect(hasTop, hasBottom),
  };
});
```

### События

```typescript
// Слушаем загрузку чанка
world.events.on('chunkLoaded', ({ chunk, chunkX, chunkY }) => {
  console.log(`Чанк загружен в ${chunkX}, ${chunkY}`);
});

// Слушаем выгрузку чанка
world.events.on('chunkUnloaded', ({ chunkX, chunkY }) => {
  console.log(`Чанк выгружен из ${chunkX}, ${chunkY}`);
});

// Слушаем модификацию чанка
world.events.on('chunkModified', ({ chunk, localX, localY }) => {
  console.log(`Чанк изменён в локальных координатах ${localX}, ${localY}`);
});
```

### Генерация на основе приоритетов

```typescript
class BossArenaGenerator extends BaseGenerator {
  readonly id = 'boss-arena';
  
  // Генерируем только в определённых координатах
  canGenerate(chunkX: number, chunkY: number): boolean {
    return chunkX === 5 && chunkY === 10;
  }
  
  // Высокий приоритет для переопределения других генераторов
  getPriority(): number {
    return 100;
  }
  
  protected buildChunk(chunk: Chunk, seed: number): void {
    // Строим арену босса
  }
}

// Регистрируем с автоматическим приоритетом из getPriority()
world.registerGenerator(new BossArenaGenerator());
```

## Конфигурация

### WorldConfig

```typescript
interface WorldConfig {
  chunkSize: number;      // Тайлов на сторону чанка (по умолчанию: 16)
  tileSize: number;       // Пикселей на тайл (по умолчанию: 32)
  loadRadius: number;     // Чанков для загрузки вокруг центра (по умолчанию: 3)
  unloadBuffer: number;   // Буфер перед выгрузкой (по умолчанию: 2)
}
```

### LODConfig

```typescript
interface LODConfig {
  maxLevels: number;      // Количество уровней LOD (по умолчанию: 4)
  thresholds: number[];   // Пороги масштаба для каждого уровня
}
```

## Советы по производительности

1. **Используйте подходящий размер чанка** — Большие чанки уменьшают накладные расходы, но увеличивают потребление памяти
2. **Включайте кэширование** — `useCache: true` в рендерере для лучшей производительности
3. **Минимизируйте изменения тайлов** — Каждое изменение инвалидирует кэш
4. **Используйте Uint8Array чанки** — Стандартный `Chunk` использует меньше памяти, чем `Uint16Chunk`
5. **Настраивайте радиус загрузки** — Меньший радиус = меньше памяти, больше загрузок/выгрузок
6. **Используйте LOD** — Удалённые чанки рендерятся с меньшей детализацией автоматически

## Поддержка TypeScript

Этот модуль написан на TypeScript и включает полные определения типов.

```typescript
import type {
  Chunk,
  TileDefinition,
  ChunkGenerator,
  WorldConfig,
  WorldEvents,
} from '@firec/map-module';
```

## Поддержка браузеров

Работает в любом современном браузере с поддержкой Canvas 2D:
- Chrome/Edge 90+
- Firefox 90+
- Safari 15+

## Лицензия

"THE BEER-WARE LICENSE" (Revision 42):
<firec@example.com> написал этот файл. Пока вы сохраняете это уведомление,
вы можете делать с этим материалом всё, что хотите. Если мы когда-нибудь встретимся,
и вы решите, что этот материал того стоит, вы можете купить мне пиво в ответ.
