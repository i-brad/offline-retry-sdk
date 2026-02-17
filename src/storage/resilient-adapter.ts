import type { StorageAdapter, StoredRequest } from '../types';
import type { Logger } from '../utils/logger';
import { MemoryAdapter } from './memory-adapter';

export class ResilientAdapter implements StorageAdapter {
  private fallback = new MemoryAdapter();
  private useFallback = false;

  constructor(
    private primary: StorageAdapter,
    private logger: Logger,
  ) {}

  private async run<T>(op: (adapter: StorageAdapter) => Promise<T>): Promise<T> {
    if (this.useFallback) return op(this.fallback);
    try {
      return await op(this.primary);
    } catch {
      this.useFallback = true;
      this.logger.warn('IndexedDB failed, switched to in-memory fallback');
      return op(this.fallback);
    }
  }

  add(request: StoredRequest) {
    return this.run((a) => a.add(request));
  }

  getAll() {
    return this.run((a) => a.getAll());
  }

  getById(id: string) {
    return this.run((a) => a.getById(id));
  }

  getByHash(hash: string) {
    return this.run((a) => a.getByHash(hash));
  }

  update(request: StoredRequest) {
    return this.run((a) => a.update(request));
  }

  remove(id: string) {
    return this.run((a) => a.remove(id));
  }

  clear() {
    return this.run((a) => a.clear());
  }

  count() {
    return this.run((a) => a.count());
  }
}
