import type { StorageAdapter } from './types';

export class DeduplicationEngine {
  constructor(private storage: StorageAdapter) {}

  async isDuplicate(hash: string): Promise<boolean> {
    const existing = await this.storage.getByHash(hash);
    return existing !== undefined;
  }
}
