/**
 * Simple LRU (Least Recently Used) cache implementation.
 * 
 * @example
 * ```typescript
 * const cache = new LRUCache<string, number>(100);
 * cache.set('key', 42);
 * console.log(cache.get('key')); // 42
 * ```
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error('LRU cache size must be greater than 0');
    }
    this.maxSize = maxSize;
  }

  /**
   * Gets a value from the cache and marks it as recently used.
   * @param key - Cache key
   * @returns The cached value, or undefined if not found
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * Sets a value in the cache. Evicts LRU item if cache is full.
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: K, value: V): void {
    // Delete if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first item in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  /**
   * Checks if a key exists in the cache.
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Deletes a key from the cache.
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clears the entire cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns the current number of items in the cache.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Returns the maximum size of the cache.
   */
  get capacity(): number {
    return this.maxSize;
  }

  /**
   * Iterates over all cache entries in LRU order (oldest to newest).
   */
  *[Symbol.iterator](): IterableIterator<[K, V]> {
    yield* this.cache.entries();
  }

  /**
   * Returns all keys in LRU order (oldest to newest).
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * Returns all values in LRU order (oldest to newest).
   */
  values(): IterableIterator<V> {
    return this.cache.values();
  }
}
