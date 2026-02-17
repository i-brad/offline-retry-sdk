import { describe, it, expect, vi, afterEach } from 'vitest';
import { IndexedDBAdapter } from '../../src/storage/indexeddb-adapter';
import type { StoredRequest } from '../../src/types';

function makeRequest(overrides: Partial<StoredRequest> = {}): StoredRequest {
  return {
    id: 'persist-test',
    url: '/api/test',
    method: 'POST',
    createdAt: Date.now(),
    retries: 0,
    maxRetries: 5,
    hash: 'persist-hash',
    ...overrides,
  };
}

describe('Persistence', () => {
  afterEach(async () => {
    const adapter = new IndexedDBAdapter();
    await adapter.clear();
  });

  it('data persists across adapter re-creation (simulates page reload)', async () => {
    const adapter1 = new IndexedDBAdapter();
    await adapter1.add(makeRequest({ id: 'r1', createdAt: 100 }));
    await adapter1.add(makeRequest({ id: 'r2', createdAt: 200, hash: 'h2' }));

    // Create a new adapter (simulates page reload)
    const adapter2 = new IndexedDBAdapter();
    const all = await adapter2.getAll();

    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('r1');
    expect(all[1].id).toBe('r2');
  });

  it('FIFO ordering persists across adapter re-creation', async () => {
    const adapter1 = new IndexedDBAdapter();
    await adapter1.add(makeRequest({ id: 'r3', createdAt: 300, hash: 'h3' }));
    await adapter1.add(makeRequest({ id: 'r1', createdAt: 100, hash: 'h1' }));
    await adapter1.add(makeRequest({ id: 'r2', createdAt: 200, hash: 'h2' }));

    const adapter2 = new IndexedDBAdapter();
    const all = await adapter2.getAll();

    expect(all.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
  });
});
