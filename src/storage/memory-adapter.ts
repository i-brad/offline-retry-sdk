import type { StorageAdapter, StoredRequest } from '../types';

export class MemoryAdapter implements StorageAdapter {
  private store = new Map<string, StoredRequest>();

  async add(request: StoredRequest): Promise<void> {
    this.store.set(request.id, request);
  }

  async getAll(): Promise<StoredRequest[]> {
    return Array.from(this.store.values()).sort(
      (a, b) => a.createdAt - b.createdAt,
    );
  }

  async getById(id: string): Promise<StoredRequest | undefined> {
    return this.store.get(id);
  }

  async getByHash(hash: string): Promise<StoredRequest | undefined> {
    for (const req of this.store.values()) {
      if (req.hash === hash) return req;
    }
    return undefined;
  }

  async update(request: StoredRequest): Promise<void> {
    this.store.set(request.id, request);
  }

  async remove(id: string): Promise<void> {
    this.store.delete(id);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async count(): Promise<number> {
    return this.store.size;
  }
}
