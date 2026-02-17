import { describe, it, expect, beforeEach } from 'vitest';
import type { StorageAdapter, StoredRequest } from '../../src/types';

function makeRequest(overrides: Partial<StoredRequest> = {}): StoredRequest {
  return {
    id: `id-${Math.random()}`,
    url: '/api/test',
    method: 'POST',
    createdAt: Date.now(),
    retries: 0,
    maxRetries: 5,
    hash: `hash-${Math.random()}`,
    ...overrides,
  };
}

export function runStorageContractTests(
  name: string,
  factory: () => StorageAdapter,
) {
  describe(`${name} (StorageAdapter contract)`, () => {
    let adapter: StorageAdapter;

    beforeEach(() => {
      adapter = factory();
    });

    it('adds and retrieves a request by id', async () => {
      const req = makeRequest({ id: 'r1' });
      await adapter.add(req);
      const found = await adapter.getById('r1');
      expect(found).toEqual(req);
    });

    it('getAll returns requests sorted by createdAt', async () => {
      const r1 = makeRequest({ id: 'r1', createdAt: 300 });
      const r2 = makeRequest({ id: 'r2', createdAt: 100 });
      const r3 = makeRequest({ id: 'r3', createdAt: 200 });
      await adapter.add(r1);
      await adapter.add(r2);
      await adapter.add(r3);

      const all = await adapter.getAll();
      expect(all.map((r) => r.id)).toEqual(['r2', 'r3', 'r1']);
    });

    it('getByHash finds matching entry', async () => {
      const req = makeRequest({ hash: 'unique-hash' });
      await adapter.add(req);
      const found = await adapter.getByHash('unique-hash');
      expect(found).toEqual(req);
    });

    it('getByHash returns undefined for no match', async () => {
      const found = await adapter.getByHash('nonexistent');
      expect(found).toBeUndefined();
    });

    it('updates an existing entry', async () => {
      const req = makeRequest({ id: 'r1', retries: 0 });
      await adapter.add(req);
      await adapter.update({ ...req, retries: 3 });
      const found = await adapter.getById('r1');
      expect(found?.retries).toBe(3);
    });

    it('removes an entry', async () => {
      const req = makeRequest({ id: 'r1' });
      await adapter.add(req);
      await adapter.remove('r1');
      const found = await adapter.getById('r1');
      expect(found).toBeUndefined();
    });

    it('clear empties the store', async () => {
      await adapter.add(makeRequest());
      await adapter.add(makeRequest());
      await adapter.clear();
      expect(await adapter.count()).toBe(0);
    });

    it('count returns the correct number', async () => {
      expect(await adapter.count()).toBe(0);
      await adapter.add(makeRequest());
      expect(await adapter.count()).toBe(1);
      await adapter.add(makeRequest());
      expect(await adapter.count()).toBe(2);
    });

    it('getById returns undefined for nonexistent id', async () => {
      const found = await adapter.getById('nope');
      expect(found).toBeUndefined();
    });
  });
}
