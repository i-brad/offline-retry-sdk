import { describe, it, expect, beforeEach } from 'vitest';
import { DeduplicationEngine } from '../../src/dedup';
import { MemoryAdapter } from '../../src/storage/memory-adapter';
import type { StoredRequest } from '../../src/types';

function makeRequest(overrides: Partial<StoredRequest> = {}): StoredRequest {
  return {
    id: 'test-id',
    url: '/api/test',
    method: 'POST',
    createdAt: Date.now(),
    retries: 0,
    maxRetries: 5,
    hash: 'test-hash',
    ...overrides,
  };
}

describe('DeduplicationEngine', () => {
  let storage: MemoryAdapter;
  let dedup: DeduplicationEngine;

  beforeEach(() => {
    storage = new MemoryAdapter();
    dedup = new DeduplicationEngine(storage);
  });

  it('returns false for a new hash', async () => {
    expect(await dedup.isDuplicate('new-hash')).toBe(false);
  });

  it('returns true for an existing hash', async () => {
    await storage.add(makeRequest({ hash: 'existing-hash' }));
    expect(await dedup.isDuplicate('existing-hash')).toBe(true);
  });
});
