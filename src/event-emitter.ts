import type { EventName, EventHandlerMap } from './types';

type Handler = (...args: any[]) => void;

export class TypedEventEmitter {
  private listeners = new Map<EventName, Set<Handler>>();

  on<E extends EventName>(event: E, handler: EventHandlerMap[E]): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as Handler);

    return () => {
      set!.delete(handler as Handler);
    };
  }

  emit<E extends EventName>(
    event: E,
    data: Parameters<EventHandlerMap[E]>[0],
  ): void {
    const set = this.listeners.get(event);
    if (!set) return;

    for (const handler of set) {
      try {
        handler(data);
      } catch {
        // Handler errors must not propagate to other handlers
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
