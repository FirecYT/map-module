# @firec/map-module

Высокопроизводительный, фреймворк-независимый движок тайловых карт с загрузкой чанков, рендерингом LOD и поддержкой процедурной генерации.

## Особенности

- **Управление миром на основе чанков** — Автоматическая загрузка/выгрузка чанков в зависимости от позиции игрока
- **Процедурная генерация** — Детерминированные генераторы чанков с поддержкой seed
- **Уровень детализации (LOD)** — Автоматическое снижение детализации для удалённых чанков
- **Кэширование через Offscreen Canvas** — Эффективный рендеринг с автоматической инвалидацией кэша и поддержкой OffscreenCanvas для Web Workers
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
  
  protected buildChunk(chunk: Chunk, ctx: BuildContext): void {
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

### Core Classes

#### World

Основная точка входа для тайлового движка. Управляет чанками, генераторами, реестром тайлов и преобразованием координат.

```typescript
class World {
  constructor(options?: WorldOptions)
}
```

**Параметры конструктора:**

- `options` *(WorldOptions, optional)* — Опции создания мира:
  - `config` *(Partial<WorldConfig>, optional)* — Конфигурация мира (размер чанка, тайла, радиус загрузки)
  - `baseSeed` *(number, optional)* — Базовый seed для детерминированной генерации (по умолчанию: 0)

**Свойства:**

- `config` *(WorldConfig, readonly)* — Текущая конфигурация мира
- `dimensions` *(WorldDimensions, readonly)* — Вычисленные размеры мира в пикселях
- `events` *(TypedEventBus<WorldEvents>, readonly)* — Шина событий для подписки на изменения
- `tiles` *(TileRegistry, readonly)* — Реестр определений тайлов
- `coords` *(CoordinateUtils, readonly)* — Утилиты для преобразования координат

**Методы:**

##### update(worldX, worldY)

Обновляет загруженные чанки на основе позиции центра (обычно позиции игрока). Загружает чанки в пределах `loadRadius` и выгружает чанки за пределами `loadRadius + unloadBuffer`.

**Параметры:**
- `worldX` *(number)* — Координата X центра в мировых пикселях
- `worldY` *(number)* — Координата Y центра в мировых пикселях

**Возвращает:** `void`

**Пример:**
```typescript
world.update(player.x, player.y);
```

##### getChunk(chunkX, chunkY)

Возвращает чанк по указанным координатам или `null`, если чанк не загружен.

**Параметры:**
- `chunkX` *(number)* — Координата X чанка в сетке чанков
- `chunkY` *(number)* — Координата Y чанка в сетке чанков

**Возвращает:** `Chunk | null` — Объект чанка или `null`, если не загружен

##### getLoadedChunks()

Возвращает массив всех загруженных в данный момент чанков.

**Возвращает:** `Chunk[]` — Массив загруженных чанков

##### isChunkLoaded(chunkX, chunkY)

Проверяет, загружен ли чанк с указанными координатами.

**Параметры:**
- `chunkX` *(number)* — Координата X чанка
- `chunkY` *(number)* — Координата Y чанка

**Возвращает:** `boolean` — `true`, если чанк загружен

##### regenerateChunk(chunkX, chunkY)

Принудительно перегенерирует указанный чанк.

**Параметры:**
- `chunkX` *(number)* — Координата X чанка
- `chunkY` *(number)* — Координата Y чанка

**Возвращает:** `void`

##### registerGenerator(generator, priority?)

Регистрирует генератор чанков с опциональным приоритетом.

**Параметры:**
- `generator` *(ChunkGenerator)* — Генератор для регистрации
- `priority` *(number, optional)* — Приоритет (выше = предпочтительнее)

**Возвращает:** `void`

##### unregisterGenerator(id)

Удаляет генератор по его ID.

**Параметры:**
- `id` *(string)* — ID генератора для удаления

**Возвращает:** `void`

##### registerTile(definition)

Регистрирует определение типа тайла.

**Параметры:**
- `definition` *(TileDefinition)* — Определение тайла

**Возвращает:** `void`

**Пример:**
```typescript
world.registerTile({ 
  id: 1, 
  name: 'wall', 
  passable: false, 
  opaque: true 
});
```

##### registerOrUpdateTile(definition)

Регистрирует или обновляет определение тайла (upsert).

**Параметры:**
- `definition` *(TileDefinition)* — Определение тайла

**Возвращает:** `void`

##### getTileAt(worldX, worldY)

Возвращает ID тайла по мировым координатам.

**Параметры:**
- `worldX` *(number)* — Мировая координата X в пикселях
- `worldY` *(number)* — Мировая координата Y в пикселях

**Возвращает:** `TileId` — ID тайла (0, если чанк не загружен)

##### getTileAtTile(tileX, tileY)

Возвращает ID тайла по глобальным тайловым координатам.

**Параметры:**
- `tileX` *(number)* — Глобальная тайловая координата X
- `tileY` *(number)* — Глобальная тайловая координата Y

**Возвращает:** `TileId` — ID тайла (0, если чанк не загружен)

##### setTileAt(worldX, worldY, tileId)

Устанавливает ID тайла по мировым координатам.

**Параметры:**
- `worldX` *(number)* — Мировая координата X в пикселях
- `worldY` *(number)* — Мировая координата Y в пикселях
- `tileId` *(TileId)* — Новый ID тайла

**Возвращает:** `boolean` — `true`, если тайл успешно изменён, `false`, если чанк не загружен

##### isPassable(worldX, worldY)

Проверяет, проходима ли позиция в мировых координатах.

**Параметры:**
- `worldX` *(number)* — Мировая координата X
- `worldY` *(number)* — Мировая координата Y

**Возвращает:** `boolean` — `true`, если позиция проходима (или чанк не загружен)

##### isOpaque(worldX, worldY)

Проверяет, блокирует ли позиция линию видимости.

**Параметры:**
- `worldX` *(number)* — Мировая координата X
- `worldY` *(number)* — Мировая координата Y

**Возвращает:** `boolean` — `true`, если позиция непрозрачна

##### getTileDefinition(worldX, worldY)

Возвращает полное определение тайла по мировым координатам.

**Параметры:**
- `worldX` *(number)* — Мировая координата X
- `worldY` *(number)* — Мировая координата Y

**Возвращает:** `TileDefinition | undefined` — Определение тайла или `undefined`

##### hasLineOfSight(startX, startY, endX, endY, stepSize?)

Проверяет наличие прямой видимости между двумя точками.

**Параметры:**
- `startX` *(number)* — Начальная координата X в пикселях
- `startY` *(number)* — Начальная координата Y в пикселях
- `endX` *(number)* — Конечная координата X в пикселях
- `endY` *(number)* — Конечная координата Y в пикселях
- `stepSize` *(number, optional)* — Расстояние между проверками (по умолчанию: 4)

**Возвращает:** `boolean` — `true`, если линия видимости не прерывается

##### getPassableNeighbors(tileX, tileY, includeDiagonals?)

Возвращает координаты проходимых соседних тайлов.

**Параметры:**
- `tileX` *(number)* — Глобальная тайловая координата X
- `tileY` *(number)* — Глобальная тайловая координата Y
- `includeDiagonals` *(boolean, optional)* — Включать ли диагональных соседей (по умолчанию: `true`)

**Возвращает:** `Array<{ x: number; y: number }>` — Массив координат проходимых соседей

##### worldToGrid(worldX, worldY)

Преобразует мировые координаты в полные координаты сетки (чанк + локальная + глобальная).

**Параметры:**
- `worldX` *(number)* — Мировая координата X
- `worldY` *(number)* — Мировая координата Y

**Возвращает:** `WorldCoord` — Объект с `chunkX`, `chunkY`, `localX`, `localY`, `tileX`, `tileY`

##### worldToChunk(worldX, worldY)

Преобразует мировые координаты в координаты чанка.

**Параметры:**
- `worldX` *(number)* — Мировая координата X
- `worldY` *(number)* — Мировая координата Y

**Возвращает:** `{ chunkX: number; chunkY: number }`

##### tileToWorld(tileX, tileY)

Преобразует глобальные тайловые координаты в мировые пиксельные координаты.

**Параметры:**
- `tileX` *(number)* — Глобальная тайловая координата X
- `tileY` *(number)* — Глобальная тайловая координата Y

**Возвращает:** `WorldPoint` — Объект с `x` и `y` в пикселях

##### dispose()

Выгружает все чанки и очищает все события.

**Возвращает:** `void`

---

#### Chunk (интерфейс)

Интерфейс, представляющий чанк мира — квадратную секцию тайлов.

```typescript
interface Chunk {
  readonly x: number
  readonly y: number
  readonly size: number
  readonly seed: number
  generation: number
}
```

**Свойства:**

- `x` *(number, readonly)* — Координата X чанка в сетке чанков
- `y` *(number, readonly)* — Координата Y чанка в сетке чанков
- `size` *(number, readonly)* — Количество тайлов на сторону (чанк всегда квадратный)
- `seed` *(number, readonly)* — Seed, использованный для генерации этого чанка
- `generation` *(number)* — Счётчик изменений (инкрементируется при изменении данных чанка)

**Методы:**

##### getTile(localX, localY)

Возвращает ID тайла по локальным координатам.

**Параметры:**
- `localX` *(number)* — Локальная координата X внутри чанка (0 до size-1)
- `localY` *(number)* — Локальная координата Y внутри чанка (0 до size-1)

**Возвращает:** `TileId` — ID тайла (0, если координаты вне границ)

**Пример:**
```typescript
const tileId = chunk.getTile(5, 10);
```

##### setTile(localX, localY, tileId)

Устанавливает ID тайла по локальным координатам. Инкрементирует счётчик `generation`.

**Параметры:**
- `localX` *(number)* — Локальная координата X (0 до size-1)
- `localY` *(number)* — Локальная координата Y (0 до size-1)
- `tileId` *(TileId)* — ID тайла для установки

**Возвращает:** `void`

##### fillRect(x, y, width, height, tileId)

Заполняет прямоугольную область указанным тайлом.

**Параметры:**
- `x` *(number)* — Начальная координата X
- `y` *(number)* — Начальная координата Y
- `width` *(number)* — Ширина прямоугольника
- `height` *(number)* — Высота прямоугольника
- `tileId` *(TileId)* — ID тайла для заполнения

**Возвращает:** `void`

##### fill(tileId)

Заполняет весь чанк одним типом тайла.

**Параметры:**
- `tileId` *(TileId)* — ID тайла для заполнения

**Возвращает:** `void`

##### getRawData()

Возвращает сырой массив данных тайлов для эффективной итерации.

**Возвращает:** `ReadonlyArray<TileId> | Uint8Array | Uint16Array` — Массив в порядке row-major: `index = y * size + x`

##### markDirty()

Помечает чанк как требующий перерисовки.

**Возвращает:** `void`

##### isDirty()

Проверяет, был ли чанк изменён с момента последней отрисовки.

**Возвращает:** `boolean` — `true`, если чанк требует перерисовки

##### clearDirty()

Сбрасывает флаг dirty. Вызывайте после отрисовки чанка.

**Возвращает:** `void`

---

#### Chunk (реализация)

Реализация чанка по умолчанию, использующая `Uint8Array` для хранения. Поддерживает ID тайлов 0-255.

```typescript
class Chunk implements IChunk {
  constructor(options: ChunkOptions)
}
```

**Параметры конструктора:**

- `options` *(ChunkOptions)* — Опции создания чанка:
  - `x` *(number)* — Координата X чанка
  - `y` *(number)* — Координата Y чанка
  - `size` *(number)* — Размер чанка (должен быть > 0 и <= 256)
  - `seed` *(number)* — Seed для этого чанка
  - `worldSeed` *(number)* — Мировой seed

**Пример:**
```typescript
const chunk = new Chunk({
  x: 5,
  y: 10,
  size: 16,
  seed: 12345,
  worldSeed: 67890
});
```

---

#### Uint16Chunk

Реализация чанка с использованием `Uint16Array`. Поддерживает ID тайлов 0-65535.

```typescript
class Uint16Chunk implements IChunk {
  constructor(options: ChunkOptions)
}
```

Использует тот же интерфейс, что и `Chunk`, но позволяет хранить больше типов тайлов за счёт увеличения потребления памяти в 2 раза.

---

#### TileRegistry

Реестр определений тайлов. Сопоставляет ID тайлов с их свойствами.

```typescript
class TileRegistry {
  constructor()
}
```

**Методы:**

##### register(definition)

Регистрирует определение тайла.

**Параметры:**
- `definition` *(TileDefinition)* — Определение тайла

**Возвращает:** `void`

**Исключения:** Выбрасывает `Error`, если тайл с таким ID уже зарегистрирован

##### registerOrUpdate(definition)

Регистрирует или обновляет определение тайла (upsert).

**Параметры:**
- `definition` *(TileDefinition)* — Определение тайла

**Возвращает:** `void`

##### unregister(id)

Удаляет определение тайла.

**Параметры:**
- `id` *(TileId)* — ID тайла для удаления

**Возвращает:** `void`

**Исключения:** Выбрасывает `Error` при попытке удалить пустой тайл (ID 0)

##### get(id)

Возвращает определение тайла по ID.

**Параметры:**
- `id` *(TileId)* — ID тайла

**Возвращает:** `TileDefinition | undefined` — Определение или `undefined`

##### getOrThrow(id)

Возвращает определение тайла или выбрасывает исключение.

**Параметры:**
- `id` *(TileId)* — ID тайла

**Возвращает:** `TileDefinition`

**Исключения:** Выбрасывает `Error`, если тайл не зарегистрирован

##### has(id)

Проверяет, зарегистрирован ли тайл.

**Параметры:**
- `id` *(TileId)* — ID тайла

**Возвращает:** `boolean`

##### isPassable(id)

Проверяет, проходим ли тайл.

**Параметры:**
- `id` *(TileId)* — ID тайла

**Возвращает:** `boolean` — `true` для незарегистрированных тайлов (считаются проходимыми)

##### isOpaque(id)

Проверяет, непрозрачен ли тайл.

**Параметры:**
- `id` *(TileId)* — ID тайла

**Возвращает:** `boolean` — `false` для незарегистрированных тайлов

##### getName(id)

Возвращает имя тайла.

**Параметры:**
- `id` *(TileId)* — ID тайла

**Возвращает:** `string` — Имя тайла или `'unknown'`

##### getAll()

Возвращает все зарегистрированные определения тайлов.

**Возвращает:** `TileDefinition[]`

##### getAllIds()

Возвращает все зарегистрированные ID тайлов.

**Возвращает:** `TileId[]`

##### size (свойство)

Количество зарегистрированных тайлов.

**Тип:** `number` (readonly)

##### clear()

Очищает все зарегистрированные тайлы, кроме пустого (ID 0).

**Возвращает:** `void`

---

#### CoordinateUtils

Утилиты для преобразования между различными системами координат.

```typescript
class CoordinateUtils {
  constructor(config: WorldConfig)
}
```

**Методы:**

##### worldToChunk(worldX, worldY)

Преобразует мировые пиксельные координаты в координаты чанка.

**Параметры:**
- `worldX` *(number)* — Мировая координата X в пикселях
- `worldY` *(number)* — Мировая координата Y в пикселях

**Возвращает:** `ChunkCoord` — Объект с `chunkX` и `chunkY`

##### worldToGrid(worldX, worldY)

Преобразует мировые координаты в полные координаты сетки.

**Параметры:**
- `worldX` *(number)* — Мировая координата X
- `worldY` *(number)* — Мировая координата Y

**Возвращает:** `WorldCoord` — Объект с `chunkX`, `chunkY`, `localX`, `localY`, `tileX`, `tileY`

##### chunkToWorld(chunkX, chunkY)

Преобразует координаты чанка в мировые пиксельные координаты (верхний левый угол чанка).

**Параметры:**
- `chunkX` *(number)* — Координата X чанка
- `chunkY` *(number)* — Координата Y чанка

**Возвращает:** `WorldPoint` — Объект с `x` и `y`

##### tileToWorld(tileX, tileY)

Преобразует глобальные тайловые координаты в мировые пиксельные координаты.

**Параметры:**
- `tileX` *(number)* — Глобальная тайловая координата X
- `tileY` *(number)* — Глобальная тайловая координата Y

**Возвращает:** `WorldPoint`

##### tileToChunk(tileX, tileY)

Преобразует глобальные тайловые координаты в координаты чанка.

**Параметры:**
- `tileX` *(number)* — Глобальная тайловая координата X
- `tileY` *(number)* — Глобальная тайловая координата Y

**Возвращает:** `ChunkCoord`

##### globalToLocal(globalCoord)

Преобразует глобальную тайловую координату в локальную внутри чанка.

**Параметры:**
- `globalCoord` *(number)* — Глобальная координата

**Возвращает:** `number` — Локальная координата (0 до chunkSize-1)

##### getChunkBounds(chunkX, chunkY)

Возвращает границы чанка в мировых пикселях.

**Параметры:**
- `chunkX` *(number)* — Координата X чанка
- `chunkY` *(number)* — Координата Y чанка

**Возвращает:** `{ minX: number; minY: number; maxX: number; maxY: number }`

##### getChunksInRect(worldX, worldY, width, height)

Возвращает все координаты чанков внутри прямоугольника в мировом пространстве.

**Параметры:**
- `worldX` *(number)* — Начальная координата X
- `worldY` *(number)* — Начальная координата Y
- `width` *(number)* — Ширина прямоугольника
- `height` *(number)* — Высота прямоугольника

**Возвращает:** `ChunkCoord[]`

##### getChunksInRadius(centerX, centerY, radius)

Возвращает все координаты чанков в радиусе от центрального чанка.

**Параметры:**
- `centerX` *(number)* — Координата X центрального чанка
- `centerY` *(number)* — Координата Y центрального чанка
- `radius` *(number)* — Радиус в чанках

**Возвращает:** `ChunkCoord[]`

---

### Generation

#### BaseGenerator

Абстрактный базовый класс для генераторов чанков. Предоставляет общие утилиты и структурированный конвейер генерации.

```typescript
abstract class BaseGenerator implements ChunkGenerator {
  abstract readonly id: string
  
  generate(options: ChunkOptions): Chunk
  protected abstract buildChunk(chunk: Chunk, ctx: BuildContext): void
  
  // Вспомогательные методы
  protected localToWorld(ctx: BuildContext, localX: number, localY: number): { x: number; y: number }
  protected worldToLocal(ctx: BuildContext, worldX: number, worldY: number): { chunkX: number; chunkY: number; localX: number; localY: number }
  
  // Опциональные методы интерфейса
  getPriority?(chunkX: number, chunkY: number): number
  canGenerate?(chunkX: number, chunkY: number): boolean
}
```

**Методы:**

##### generate(options)

Генерирует новый чанк. Создаёт пустой чанк и вызывает `buildChunk` для заполнения.

**Параметры:**
- `options` *(ChunkOptions)* — Опции создания чанка

**Возвращает:** `Chunk` — Сгенерированный чанок

##### buildChunk(chunk, ctx) *(abstract)*

Переопределите этот метод для реализации логики генерации. Чанк уже создан и инициализирован нулями.

**Параметры:**
- `chunk` *(Chunk)* — Чанок для заполнения
- `ctx` *(BuildContext)* — Контекст сборки с seed, worldSeed и информацией о координатах

**Возвращает:** `void`

##### localToWorld(ctx, localX, localY)

Преобразует локальные тайловые координаты в мировые тайловые координаты.

**Параметры:**
- `ctx` *(BuildContext)* — Контекст сборки
- `localX` *(number)* — Локальная координата X (0..chunkSize-1)
- `localY` *(number)* — Локальная координата Y (0..chunkSize-1)

**Возвращает:** `{ x: number; y: number }` — Мировые тайловые координаты

##### worldToLocal(ctx, worldX, worldY)

Преобразует мировые тайловые координаты обратно в локальные координаты чанка.

**Параметры:**
- `ctx` *(BuildContext)* — Контекст сборки
- `worldX` *(number)* — Мировая тайловая координата X
- `worldY` *(number)* — Мировая тайловая координата Y

**Возвращает:** `{ chunkX: number; chunkY: number; localX: number; localY: number }`

**Пример использования:**
```typescript
class MyGenerator extends BaseGenerator {
  readonly id = 'my-generator';

  protected buildChunk(chunk: Chunk, ctx: BuildContext): void {
    // Непрерывный шум — бесшовный между чанками
    const noise = new ValueNoise2D(ctx.worldSeed);
    for (let ly = 0; ly < chunk.size; ly++) {
      for (let lx = 0; lx < chunk.size; lx++) {
        const world = this.localToWorld(ctx, lx, ly);
        const height = noise.get(world.x * 0.1, world.y * 0.1);
        chunk.setTile(lx, ly, height > 0.5 ? 1 : 2);
      }
    }

    // Дискретная случайность для каждого чанка
    const rng = new SeededRandom(ctx.seed);
    if (rng.chance(0.3)) {
      chunk.setTile(rng.nextInt(0, chunk.size), rng.nextInt(0, chunk.size), 3);
    }
  }
}
```

---

#### BuildContext

Контекст, передаваемый в `buildChunk`, содержащий данные уровня чанка и мира.

```typescript
interface BuildContext {
  readonly seed: number
  readonly worldSeed: number
  readonly chunkX: number
  readonly chunkY: number
  readonly chunkSize: number
}
```

**Принцип двух seed:**

- **`seed`** (для каждого чанка): производный от координат чанка + мирового seed. Используйте для *дискретных* решений, локальных для этого чанка: количество структур, декорации, случайный лут
- **`worldSeed`**: одинаковый для ВСЕХ чанков в мире. Используйте для seed функций шума (ValueNoise2D и т.д.) и сэмплируйте их с **мировыми координатами** (`chunkX * size + localX`). Это гарантирует, что непрерывные поля (карта высот, биомы, температура) будут бесшовными на границах чанков

---

#### ChunkGenerator (интерфейс)

Интерфейс для генераторов чанков.

```typescript
interface ChunkGenerator {
  readonly id: string
  generate(options: ChunkOptions): Chunk
  getPriority?(chunkX: number, chunkY: number): number
  canGenerate?(chunkX: number, chunkY: number): boolean
}
```

**Свойства:**

- `id` *(string, readonly)* — Уникальный идентификатор генератора

**Методы:**

##### generate(options)

Генерирует новый чанок с указанными опциями. Должен быть детерминированным.

**Параметры:**
- `options` *(ChunkOptions)* — Опции создания чанка

**Возвращает:** `Chunk` — Полностью сгенерированный чанок

##### getPriority(chunkX, chunkY) *(optional)*

Возвращает приоритет генератора для указанной позиции чанка.

**Параметры:**
- `chunkX` *(number)* — Координата X чанка
- `chunkY` *(number)* — Координата Y чанка

**Возвращает:** `number` — Значение приоритета (выше = предпочтительнее)

##### canGenerate(chunkX, chunkY) *(optional)*

Проверяет, должен ли этот генератор обрабатывать указанный чанок.

**Параметры:**
- `chunkX` *(number)* — Координата X чанка
- `chunkY` *(number)* — Координата Y чанка

**Возвращает:** `boolean` — `true`, если генератор должен обработать чанок

---

#### SeededRandom

Детерминированный генератор псевдослучайных чисел с использованием LCG (Linear Congruential Generator).

```typescript
class SeededRandom {
  constructor(seed: number)
}
```

**Методы:**

##### next()

Возвращает псевдослучайное число в диапазоне [0, 1).

**Возвращает:** `number`

##### nextInt(min, max)

Возвращает псевдослучайное целое число в диапазоне [min, max).

**Параметры:**
- `min` *(number)* — Минимальное значение (включительно)
- `max` *(number)* — Максимальное значение (исключительно)

**Возвращает:** `number`

##### choice(arr)

Возвращает случайный элемент из массива.

**Параметры:**
- `arr` *(readonly T[])* — Массив для выбора

**Возвращает:** `T` — Случайный элемент

##### shuffle(arr)

Перемешивает массив на месте, используя алгоритм Фишера-Йетса.

**Параметры:**
- `arr` *(T[])* — Массив для перемешивания

**Возвращает:** `T[]` — Тот же массив, перемешанный

##### chance(probability)

Возвращает boolean с заданной вероятностью быть `true`.

**Параметры:**
- `probability` *(number)* — Вероятность возврата `true` (от 0 до 1)

**Возвращает:** `boolean`

##### normal(mean?, stddev?)

Возвращает нормально распределённое случайное число (преобразование Бокса-Мюллера).

**Параметры:**
- `mean` *(number, optional)* — Среднее значение распределения (по умолчанию: 0)
- `stddev` *(number, optional)* — Стандартное отклонение (по умолчанию: 1)

**Возвращает:** `number`

##### fork(offset)

Создаёт новый SeededRandom с производным seed.

**Параметры:**
- `offset` *(number)* — Смещение для применения к текущему seed

**Возвращает:** `SeededRandom` — Новый экземпляр с независимой последовательностью

##### getSeed()

Возвращает текущее значение seed.

**Возвращает:** `number`

**Пример:**
```typescript
const rng = new SeededRandom(12345);
console.log(rng.next()); // Всегда одно и то же значение для seed 12345
console.log(rng.nextInt(1, 10)); // Целое число в [1, 10)
console.log(rng.chance(0.3)); // 30% шанс true
```

---

#### createSeedFromCoords(x, y, baseSeed?)

Создаёт детерминированный seed из координат.

**Параметры:**
- `x` *(number)* — Координата X
- `y` *(number)* — Координата Y
- `baseSeed` *(number, optional)* — Базовый seed (по умолчанию: 0)

**Возвращает:** `number` — Детерминированный seed

---

#### ValueNoise2D

Простая 2D value noise для процедурной генерации.

```typescript
class ValueNoise2D {
  constructor(seed: number)
}
```

**Методы:**

##### get(x, y)

Возвращает значение шума по указанным координатам.

**Параметры:**
- `x` *(number)* — Координата X
- `y` *(number)* — Координата Y

**Возвращает:** `number` — Значение шума в диапазоне [0, 1]

##### octave(x, y, octaves?, persistence?, lacunarity?)

Возвращает многооктавный шум (фрактальное броуновское движение).

**Параметры:**
- `x` *(number)* — Координата X
- `y` *(number)* — Координата Y
- `octaves` *(number, optional)* — Количество октав (слоёв) (по умолчанию: 4)
- `persistence` *(number, optional)* — Множитель амплитуды на октаву (обычно 0.5)
- `lacunarity` *(number, optional)* — Множитель частоты на октаву (обычно 2.0)

**Возвращает:** `number` — Значение шума (нормализовано примерно к [0, 1])

##### getRange(x, y, min, max)

Возвращает значение шума в пользовательском диапазоне.

**Параметры:**
- `x` *(number)* — Координата X
- `y` *(number)* — Координата Y
- `min` *(number)* — Минимальное выходное значение
- `max` *(number)* — Максимальное выходное значение

**Возвращает:** `number`

**Пример:**
```typescript
const noise = new ValueNoise2D(12345);
const value = noise.get(10.5, 20.3); // Значение в [0, 1]
const octaveValue = noise.octave(10.5, 20.3, 4, 0.5); // Многооктавный
```

---

#### createNoise2D(seed)

Создаёт простую 2D функцию шума из seed.

**Параметры:**
- `seed` *(number)* — Seed для генерации шума

**Возвращает:** `(x: number, y: number) => number` — Функция шума

---

#### EmptyGenerator

Генератор, создающий пустые (все проходимые) чанки.

```typescript
class EmptyGenerator extends BaseGenerator {
  readonly id = 'empty'
}
```

---

#### CheckerboardGenerator

Генератор, создающий простой шахматный узор.

```typescript
class CheckerboardGenerator extends BaseGenerator {
  constructor(tileA?: number, tileB?: number)
}
```

**Параметры конструктора:**
- `tileA` *(number, optional)* — ID первого тайла (по умолчанию: 1)
- `tileB` *(number, optional)* — ID второго тайла (по умолчанию: 2)

---

### Rendering

#### CanvasChunkRenderer

Рендерит чанки в Canvas 2D контекст с поддержкой LOD и кэшированием в offscreen canvas.

```typescript
class CanvasChunkRenderer {
  constructor(config: CanvasRendererConfig)
}
```

**Параметры конструктора:**

- `config` *(CanvasRendererConfig)* — Конфигурация рендерера:
  - `tiles` *(TileRegistry, optional)* — Реестр тайлов
  - `worldConfig` *(WorldConfig)* — Конфигурация мира
  - `visuals` *(Map<TileId, TileVisualProvider>)* — Карта визуалов тайлов
  - `useCache` *(boolean, optional)* — Использовать ли кэширование (по умолчанию: `true`)

**Методы:**

##### render(chunk, ctx, destX, destY, scale?, lod?)

Рендерит чанок в целевой контекст.

**Параметры:**
- `chunk` *(Chunk)* — Чанок для рендеринга
- `ctx` *(CanvasRenderingContext2D)* — Целевой контекст canvas
- `destX` *(number)* — Конечная координата X в целевой системе координат
- `destY` *(number)* — Конечная координата Y в целевой системе координат
- `scale` *(number, optional)* — Коэффициент масштабирования (по умолчанию: 1)
- `lod` *(number, optional)* — Уровень детализации (0 = наивысшая детализация)

**Возвращает:** `void`

##### setVisual(tileId, visual)

Обновляет визуал для указанного тайла.

**Параметры:**
- `tileId` *(TileId)* — ID тайла
- `visual` *(TileVisualProvider)* — Провайдер визуала

**Возвращает:** `void`

##### removeVisual(tileId)

Удаляет визуал для указанного тайла.

**Параметры:**
- `tileId` *(TileId)* — ID тайла

**Возвращает:** `void`

##### clearCache()

Очищает кэш рендерера.

**Возвращает:** `void`

##### dispose()

Освобождает все кэшированные ресурсы.

**Возвращает:** `void`

---

#### ChunkViewManager

Управляет рендерингом нескольких чанков с отсечением по фрустуму и LOD.

```typescript
class ChunkViewManager {
  constructor(config: ChunkViewManagerConfig)
}
```

**Параметры конструктора:**

- `config` *(ChunkViewManagerConfig)* — Конфигурация менеджера:
  - `worldConfig` *(WorldConfig)* — Конфигурация мира
  - `renderer` *(ChunkRenderer)* — Рендерер чанков
  - `lodManager` *(LODManager, optional)* — Менеджер LOD

**Методы:**

##### render(chunks, ctx, cameraX, cameraY, viewportWidth, viewportHeight, scale?)

Рендерит все видимые чанки.

**Параметры:**
- `chunks` *(Chunk[])* — Массив загруженных чанков
- `ctx` *(CanvasRenderingContext2D)* — Целевой контекст canvas
- `cameraX` *(number)* — Координата X центра камеры в мировых координатах
- `cameraY` *(number)* — Координата Y центра камеры в мировых координатах
- `viewportWidth` *(number)* — Ширина viewport в пикселях
- `viewportHeight` *(number)* — Высота viewport в пикселях
- `scale` *(number, optional)* — Масштаб камеры (по умолчанию: 1)

**Возвращает:** `void`

##### clearCache()

Очищает кэш всех рендереров.

**Возвращает:** `void`

##### dispose()

Освобождает все ресурсы.

**Возвращает:** `void`

---

#### LODManager

Управляет выбором уровня детализации на основе масштаба viewport.

```typescript
class LODManager {
  constructor(config?: LODConfig)
}
```

**Методы:**

##### getLevelForScale(scale)

Возвращает соответствующий уровень LOD для заданного масштаба.

**Параметры:**
- `scale` *(number)* — Текущий масштаб viewport (1.0 = 100%, 0.5 = 50%)

**Возвращает:** `number` — Уровень LOD (0 = наивысшая детализация)

##### getTileSizeForLOD(baseTileSize, lod)

Возвращает размер тайла для рендеринга (в пикселях) для указанного уровня LOD.

**Параметры:**
- `baseTileSize` *(number)* — Базовый размер тайла в пикселях
- `lod` *(number)* — Уровень LOD

**Возвращает:** `number` — Размер тайла для рендеринга (минимум 1 пиксель)

##### getCanvasSizeForLOD(chunkSize, baseTileSize, lod)

Возвращает размер offscreen canvas для указанного уровня LOD.

**Параметры:**
- `chunkSize` *(number)* — Количество тайлов на сторону чанка
- `baseTileSize` *(number)* — Базовый размер тайла
- `lod` *(number)* — Уровень LOD

**Возвращает:** `number` — Размер canvas (ширина = высота)

##### maxLevel (свойство)

Максимальный уровень LOD.

**Тип:** `number` (readonly)

##### getConfig()

Возвращает конфигурацию.

**Возвращает:** `Readonly<LODConfig>`

---

#### Canvas Factory Utilities

##### createCanvas(width, height)

Создаёт элемент canvas, используя лучший доступжный метод.

**Параметры:**
- `width` *(number)* — Ширина canvas в пикселях
- `height` *(number)* — Высота canvas в пикселях

**Возвращает:** `CanvasType | null` — Элемент canvas или `null`, если недоступен

##### getCanvasContext(canvas)

Получает 2D контекст рендеринга из canvas.

**Параметры:**
- `canvas` *(CanvasType)* — Элемент canvas

**Возвращает:** `CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null`

##### canvasToImageBitmap(canvas)

Преобразует OffscreenCanvas в ImageBitmap для эффективного рендеринга.

**Параметры:**
- `canvas` *(CanvasType)* — Элемент canvas

**Возвращает:** `Promise<ImageBitmap | null>`

##### isOffscreenCanvas(canvas)

Проверяет, является ли canvas OffscreenCanvas.

**Параметры:**
- `canvas` *(CanvasType)* — Элемент canvas

**Возвращает:** `boolean`

##### isHTMLCanvasElement(canvas)

Проверяет, является ли canvas HTMLCanvasElement.

**Параметры:**
- `canvas` *(CanvasType)* — Элемент canvas

**Возвращает:** `boolean`

---

### Events

#### TypedEventBus

Простая типобезопасная шина событий для событий модуля.

```typescript
class TypedEventBus<TEvents extends Record<string, unknown>> {
  constructor()
}
```

**Методы:**

##### on(event, callback)

Подписывается на событие.

**Параметры:**
- `event` *(K)* — Имя события
- `callback` *((data: TEvents[K]) => void)* — Функция обратного вызова

**Возвращает:** `() => void` — Функция отписки

##### once(event, callback)

Подписывается на событие, но срабатывает только один раз.

**Параметры:**
- `event` *(K)* — Имя события
- `callback` *((data: TEvents[K]) => void)* — Функция обратного вызова

**Возвращает:** `() => void` — Функция отписки

##### emit(event, data)

Отправляет событие всем подписчикам.

**Параметры:**
- `event` *(K)* — Имя события
- `data` *(TEvents[K])* — Данные события

**Возвращает:** `void`

##### off(event?)

Удаляет все слушатели для события или все слушатели, если событие не указано.

**Параметры:**
- `event` *(K, optional)* — Имя события

**Возвращает:** `void`

##### listenerCount(event)

Возвращает количество слушателей для события.

**Параметры:**
- `event` *(K)* — Имя события

**Возвращает:** `number`

**Пример:**
```typescript
const events = new TypedEventBus<{ click: { x: number; y: number } }>();

const unsubscribe = events.on('click', (data) => {
  console.log(data.x, data.y);
});

events.emit('click', { x: 10, y: 20 });
unsubscribe(); // Отписка
```

---

#### WorldEvents

Типы событий мира.

```typescript
type WorldEvents = {
  chunkLoaded: ChunkLoadedEvent
  chunkUnloaded: ChunkUnloadedEvent
  chunkModified: ChunkModifiedEvent
  chunksUpdated: ChunksUpdatedEvent
}
```

**События:**

##### chunkLoaded

Отправляется при загрузке чанка.

**Данные:** `ChunkLoadedEvent`
```typescript
{
  chunk: Chunk
  chunkX: number
  chunkY: number
}
```

##### chunkUnloaded

Отправляется при выгрузке чанка.

**Данные:** `ChunkUnloadedEvent`
```typescript
{
  chunkX: number
  chunkY: number
}
```

##### chunkModified

Отправляется при изменении чанка.

**Данные:** `ChunkModifiedEvent`
```typescript
{
  chunk: Chunk
  chunkX: number
  chunkY: number
  localX?: number
  localY?: number
}
```

##### chunksUpdated

Отправляется при обновлении чанков вокруг позиции.

**Данные:** `ChunksUpdatedEvent`
```typescript
{
  centerX: number
  centerY: number
  loadedChunks: ChunkCoord[]
  unloadedChunks: ChunkCoord[]
}
```

---

### Types & Interfaces

#### TileId

```typescript
type TileId = number
```

Числовой идентификатор для типов тайлов. 0 зарезервирован для "пустого" тайла.

---

#### TileDefinition

```typescript
interface TileDefinition {
  id: TileId
  name: string
  passable: boolean
  opaque?: boolean
  metadata?: Record<string, unknown>
}
```

**Свойства:**
- `id` *(TileId)* — Уникальный идентификатор
- `name` *(string)* — Человеко-читаемое имя
- `passable` *(boolean)* — Могут ли сущности проходить сквозь тайл
- `opaque` *(boolean, optional)* — Блокирует ли тайл линию видимости
- `metadata` *(Record<string, unknown>, optional)* — Произвольные метаданные

---

#### ChunkOptions

```typescript
interface ChunkOptions {
  x: number
  y: number
  size: number
  seed: number
  worldSeed: number
}
```

**Свойства:**
- `x` *(number)* — Координата X чанка в сетке чанков
- `y` *(number)* — Координата Y чанка в сетке чанков
- `size` *(number)* — Количество тайлов на сторону (чанк всегда квадратный)
- `seed` *(number)* — Seed для этого конкретного чанка (уникален для позиции)
- `worldSeed` *(number)* — Мировой seed (одинаков для всех чанков)

---

#### WorldConfig

```typescript
interface WorldConfig {
  chunkSize: number
  tileSize: number
  loadRadius: number
  unloadBuffer: number
}
```

**Свойства:**
- `chunkSize` *(number)* — Количество тайлов на сторону чанка (по умолчанию: 16)
- `tileSize` *(number)* — Размер каждого тайла в пикселях (по умолчанию: 32)
- `loadRadius` *(number)* — Количество чанков для загрузки вокруг центра (по умолчанию: 3)
- `unloadBuffer` *(number)* — Буфер перед выгрузкой (по умолчанию: 2)

---

#### TileVisual

```typescript
interface TileVisual {
  sprite?: unknown
  color?: string
  spriteRect?: { x: number; y: number; width: number; height: number }
  flipX?: boolean
  flipY?: boolean
  rotation?: number
  scale?: number
}
```

**Свойства:**
- `sprite` *(unknown, optional)* — Источник изображения спрайта
- `color` *(string, optional)* — Цвет-фолбэк, если спрайт недоступен
- `spriteRect` *(object, optional)* — Координаты спрайт-листа
- `flipX` *(boolean, optional)* — Отразить спрайт по горизонтали
- `flipY` *(boolean, optional)* — Отразить спрайт по вертикали
- `rotation` *(number, optional)* — Угол поворота в радианах
- `scale` *(number, optional)* — Коэффициент масштабирования

---

#### TileVisualProvider

```typescript
type TileVisualProvider = 
  | TileVisual 
  | ((context: TileVisualContext) => TileVisual | null)
```

Статический визуал или функция для динамических визуалов.

---

#### TileVisualContext

```typescript
interface TileVisualContext {
  chunk: Chunk
  tileId: TileId
  localX: number
  localY: number
  globalTileX: number
  globalTileY: number
}
```

Контекст, передаваемый провайдерам динамических визуалов.

---

#### Coordinate Types

##### Point2D
```typescript
interface Point2D {
  x: number
  y: number
}
```

##### WorldPoint
```typescript
type WorldPoint = Point2D
```
Мировые координаты в пикселях.

##### ChunkCoord
```typescript
interface ChunkCoord {
  chunkX: number
  chunkY: number
}
```
Координаты чанка в сетке чанков.

##### WorldCoord
```typescript
interface WorldCoord extends ChunkCoord {
  localX: number
  localY: number
  tileX: number
  tileY: number
}
```
Полные координаты сетки, включая локальную и глобальную информацию.

##### ChunkKey
```typescript
type ChunkKey = string
```
Ключ для уникальной идентификации чанка в картах (формат: `"x,y"`).

**Утилиты:**
- `createChunkKey(chunkX, chunkY)` — Создаёт ключ из координат
- `parseChunkKey(key)` — Парсит ключ обратно в координаты

---

#### Constants

##### EMPTY_TILE_ID
```typescript
const EMPTY_TILE_ID: TileId = 0
```
ID пустого тайла.

##### EMPTY_TILE
```typescript
const EMPTY_TILE: TileDefinition
```
Определение пустого тайла по умолчанию.

##### DEFAULT_WORLD_CONFIG
```typescript
const DEFAULT_WORLD_CONFIG: WorldConfig
```
Конфигурация мира по умолчанию.

##### DEFAULT_LOD_CONFIG
```typescript
const DEFAULT_LOD_CONFIG: LODConfig
```
Конфигурация LOD по умолчанию.

## Продвинутое использование

### Пользовательский генератор с шумом

```typescript
import { BaseGenerator, ValueNoise2D, SeededRandom } from '@firec/map-module';
import type { Chunk, BuildContext } from '@firec/map-module';

class TerrainGenerator extends BaseGenerator {
  readonly id = 'terrain';
  
  protected buildChunk(chunk: Chunk, ctx: BuildContext): void {
    // Используем worldSeed для шума — обеспечивает бесшовность между чанками
    const noise = new ValueNoise2D(ctx.worldSeed);
    // Используем seed для дискретных решений — уникально для каждого чанка
    const rng = new SeededRandom(ctx.seed);
    
    for (let ly = 0; ly < chunk.size; ly++) {
      for (let lx = 0; lx < chunk.size; lx++) {
        // Мировые координаты для бесшовного шума
        const worldX = ctx.chunkX * chunk.size + lx;
        const worldY = ctx.chunkY * chunk.size + ly;
        
        // Многослойный шум для естественного ландшафта
        const height = noise.octave(worldX * 0.05, worldY * 0.05, 4);
        
        if (height < 0.3) {
          chunk.setTile(lx, ly, TILES.WATER);
        } else if (height < 0.6) {
          chunk.setTile(lx, ly, TILES.GRASS);
        } else {
          chunk.setTile(lx, ly, TILES.MOUNTAIN);
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
  
  protected buildChunk(chunk: Chunk, ctx: BuildContext): void {
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

### OffscreenCanvas поддержка

Модуль автоматически использует `OffscreenCanvas` когда доступен, что позволяет:
- Рендерить в Web Workers (не блокируя main thread)
- Использовать в headless окружениях (Node.js с canvas)
- Улучшить производительность за счёт параллельной обработки

```typescript
import { createCanvas, isOffscreenCanvas } from '@firec/map-module';

// Автоматический выбор лучшего варианта
const canvas = createCanvas(512, 512);

if (canvas && isOffscreenCanvas(canvas)) {
  console.log('Используется OffscreenCanvas — можно в Worker!');
}
```

Если вам нужна кастомная фабрика (например, для тестирования):

```typescript
import { CanvasFactory } from '@firec/map-module';

const customFactory: CanvasFactory = (width, height) => {
  // Ваша логика создания canvas
  return myMockCanvas;
};
```

## Лицензия

"THE BEER-WARE LICENSE" (Revision 42):
<firec> написал этот файл. Пока вы сохраняете это уведомление,
вы можете делать с этим материалом всё, что хотите. Если мы когда-нибудь встретимся,
и вы решите, что этот материал того стоит, вы можете купить мне пиво в ответ.
