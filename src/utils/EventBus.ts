/**
 * Simple type-safe event emitter for module events.
 * 
 * @example
 * ```typescript
 * const events = new TypedEventBus<{ click: { x: number; y: number } }>();
 * 
 * events.on('click', (data) => console.log(data.x, data.y));
 * events.emit('click', { x: 10, y: 20 });
 * ```
 */
export class TypedEventBus<TEvents extends Record<string, unknown>> {
  private listeners = new Map<keyof TEvents, Set<(data: never) => void>>();

  /**
   * Subscribes to an event.
   * @param event - Event name
   * @param callback - Callback function
   * @returns Unsubscribe function
   */
  on<K extends keyof TEvents>(
    event: K,
    callback: (data: TEvents[K]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(callback as (data: never) => void);

    return () => {
      set.delete(callback as (data: never) => void);
    };
  }

  /**
   * Subscribes to an event, but only fires once.
   * @param event - Event name
   * @param callback - Callback function
   * @returns Unsubscribe function
   */
  once<K extends keyof TEvents>(
    event: K,
    callback: (data: TEvents[K]) => void
  ): () => void {
    const unsubscribe = this.on(event, (data) => {
      unsubscribe();
      callback(data);
    });
    return unsubscribe;
  }

  /**
   * Emits an event to all subscribers.
   * @param event - Event name
   * @param data - Event data
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const callback of set) {
        try {
          callback(data as never);
        } catch (error) {
          console.error(`Error in event handler for "${String(event)}":`, error);
        }
      }
    }
  }

  /**
   * Removes all listeners for an event, or all listeners if no event specified.
   * @param event - Optional event name
   */
  off<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Returns the number of listeners for an event.
   * @param event - Event name
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
